import { useRef, useState, useCallback } from 'react'
import { transcribeAudioApi } from '../services/interview.api'

/**
 * useVoiceAnalysis
 * Voice Pipeline: MediaRecorder → Groq Whisper (backend) for reliable transcription.
 * Falls back to Web Speech API only as a secondary visual indicator.
 */
export function useVoiceAnalysis() {
    // ── Refs ────────────────────────────────────────────────────────────────────
    const mediaStreamRef    = useRef(null)
    const mediaRecorderRef  = useRef(null)
    const audioChunksRef    = useRef([])
    const audioCtxRef       = useRef(null)
    const animFrameRef      = useRef(null)
    const stoppedRef        = useRef(true)
    const mimeTypeRef       = useRef('audio/webm')
    const chunkIntervalRef  = useRef(null)
    const transcriptRef     = useRef('')   // accumulated transcript text

    const wordCountRef      = useRef(0)
    const pauseRef          = useRef(0)
    const startTimeRef      = useRef(null)

    // ── State ───────────────────────────────────────────────────────────────────
    const [transcript,   setTranscript]  = useState('')
    const [isListening,  setIsListening] = useState(false)
    const [voiceLevel,   setVoiceLevel]  = useState(0)
    const [voiceError,   setVoiceError]  = useState(null)

    // ─────────────────────────────────────────────────────────────────────────
    // Volume Meter (Web Audio API)
    // ─────────────────────────────────────────────────────────────────────────
    const startVolumeMeter = (stream) => {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext
            if (!AudioCtx) return
            const audioCtx = new AudioCtx()
            audioCtxRef.current = audioCtx
            const source = audioCtx.createMediaStreamSource(stream)
            const analyser = audioCtx.createAnalyser()
            analyser.fftSize = 256
            source.connect(analyser)
            const dataArray = new Uint8Array(analyser.frequencyBinCount)
            const tick = () => {
                if (stoppedRef.current) { setVoiceLevel(0); return }
                analyser.getByteFrequencyData(dataArray)
                let sum = 0
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
                const level = Math.min(100, Math.round(((sum / dataArray.length) / 64) * 100))
                setVoiceLevel(level)
                animFrameRef.current = requestAnimationFrame(tick)
            }
            tick()
        } catch (err) {
            console.warn('Volume meter error:', err)
        }
    }

    const stopVolumeMeter = () => {
        if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null }
        if (audioCtxRef.current) { try { audioCtxRef.current.close() } catch (_) {}; audioCtxRef.current = null }
        setVoiceLevel(0)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Send accumulated chunks to Groq Whisper and append transcript
    // ─────────────────────────────────────────────────────────────────────────
    const flushChunks = useCallback(async () => {
        if (audioChunksRef.current.length === 0) return

        const chunks = [...audioChunksRef.current]
        audioChunksRef.current = []

        try {
            const mimeType = mimeTypeRef.current
            const blob = new Blob(chunks, { type: mimeType })

            // Only send if blob has meaningful content (> 5KB)
            if (blob.size < 5000) return

            const data = await transcribeAudioApi(blob, mimeType)
            if (data?.transcript?.trim()) {
                const newText = data.transcript.trim()
                transcriptRef.current = (transcriptRef.current + ' ' + newText).trim()
                setTranscript(transcriptRef.current)
                wordCountRef.current = transcriptRef.current.split(/\s+/).filter(Boolean).length
            }
        } catch (err) {
            console.warn('Whisper transcription chunk error:', err)
        }
    }, [])

    // ─────────────────────────────────────────────────────────────────────────
    // Start Recording
    // ─────────────────────────────────────────────────────────────────────────
    const startVoiceAnalysis = useCallback(async () => {
        // Reset state
        stoppedRef.current       = false
        transcriptRef.current    = ''
        audioChunksRef.current   = []
        wordCountRef.current     = 0
        pauseRef.current         = 0
        startTimeRef.current     = Date.now()
        setTranscript('')
        setVoiceLevel(0)
        setVoiceError(null)

        // 1. Request mic permission
        let stream
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            mediaStreamRef.current = stream
        } catch (err) {
            console.error('Mic permission error:', err)
            setVoiceError('Microphone access denied. Please allow mic in browser settings and try again.')
            stoppedRef.current = true
            return
        }

        // 2. Start volume meter
        startVolumeMeter(stream)

        // 3. Determine best supported mime type for MediaRecorder
        const PREFERRED = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/ogg',
            'audio/mp4',
        ]
        const supportedMime = PREFERRED.find(m => MediaRecorder.isTypeSupported(m)) || ''
        mimeTypeRef.current = supportedMime || 'audio/webm'

        // 4. Create MediaRecorder
        try {
            const recorderOptions = supportedMime ? { mimeType: supportedMime } : {}
            const recorder = new MediaRecorder(stream, recorderOptions)
            mediaRecorderRef.current = recorder

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    audioChunksRef.current.push(e.data)
                }
            }

            recorder.onerror = (e) => {
                console.error('MediaRecorder error:', e)
                setVoiceError('Recording error occurred. Please try again.')
            }

            // Request data every 5 seconds
            recorder.start(5000)
            setIsListening(true)

            // 5. Every 6 seconds, flush chunks to Whisper
            chunkIntervalRef.current = setInterval(() => {
                if (!stoppedRef.current) {
                    flushChunks()
                }
            }, 6000)

        } catch (err) {
            console.error('MediaRecorder init error:', err)
            setVoiceError('Could not start voice recording. Please use Chrome or Firefox.')
            stoppedRef.current = true
            stream.getTracks().forEach(t => t.stop())
            stopVolumeMeter()
        }
    }, [flushChunks])

    // ─────────────────────────────────────────────────────────────────────────
    // Stop Recording
    // ─────────────────────────────────────────────────────────────────────────
    const stopVoiceAnalysis = useCallback(async () => {
        stoppedRef.current = true

        // Clear chunk interval
        if (chunkIntervalRef.current) {
            clearInterval(chunkIntervalRef.current)
            chunkIntervalRef.current = null
        }

        // Stop recorder — this triggers final ondataavailable
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop()
            mediaRecorderRef.current = null
        }

        // Stop mic tracks
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(t => t.stop())
            mediaStreamRef.current = null
        }

        stopVolumeMeter()
        setIsListening(false)

        // Flush any remaining chunks
        await flushChunks()
    }, [flushChunks])

    const resetTranscript = useCallback(() => {
        transcriptRef.current  = ''
        wordCountRef.current   = 0
        pauseRef.current       = 0
        startTimeRef.current   = Date.now()
        audioChunksRef.current = []
        setTranscript('')
        setVoiceLevel(0)
    }, [])

    const getVoiceMetrics = useCallback(() => {
        const totalMs  = startTimeRef.current ? Date.now() - startTimeRef.current : 1000
        const totalSec = totalMs / 1000
        const wc       = wordCountRef.current
        return {
            speakingRate:     wc > 0 ? +(wc / totalSec * 60).toFixed(1) : 0,
            pauseRatio:       +(Math.min(pauseRef.current * 0.04, 0.5)).toFixed(3),
            rmsVariance:      0.02,
            silenceCount:     pauseRef.current,
            totalDurationSec: +totalSec.toFixed(1),
            wordCount:        wc,
        }
    }, [])

    return {
        transcript,
        isListening,
        voiceLevel,
        voiceError,
        startVoiceAnalysis,
        stopVoiceAnalysis,
        getVoiceMetrics,
        resetTranscript,
    }
}
