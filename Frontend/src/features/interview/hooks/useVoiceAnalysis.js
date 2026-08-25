import { useRef, useState, useCallback } from 'react'

/**
 * useVoiceAnalysis
 * Full Voice Pipeline: SpeechRecognition + MediaStream Volume Meter + Mic Permission Guard.
 */
export function useVoiceAnalysis() {
    const recRef               = useRef(null)   // SpeechRecognition instance
    const mediaStreamRef       = useRef(null)   // MediaStream for mic check & volume meter
    const audioCtxRef          = useRef(null)   // AudioContext for level meter
    const animFrameRef         = useRef(null)   // RAF handle for level meter
    
    const stoppedRef           = useRef(true)   // Intentional stop flag
    const baseTextRef          = useRef('')     // Accumulated text from previous sessions
    const currentSessionFinalRef = useRef('')   // Accumulated final text in current session
    const startFnRef           = useRef(null)   // Ref to start function
    const restartTimeoutRef    = useRef(null)

    const wordCountRef         = useRef(0)
    const pauseRef             = useRef(0)
    const startTimeRef         = useRef(null)

    const [transcript,   setTranscript]   = useState('')
    const [isListening,  setIsListening]  = useState(false)
    const [voiceLevel,   setVoiceLevel]   = useState(0)
    const [voiceError,   setVoiceError]   = useState(null)

    // ─────────────────────────────────────────────────────────────────────────
    // Volume Meter Loop via Web Audio API
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
                if (stoppedRef.current || !analyser) {
                    setVoiceLevel(0)
                    return
                }
                analyser.getByteFrequencyData(dataArray)
                let sum = 0
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i]
                }
                const avg = sum / dataArray.length
                // Scale 0-128 average to 0-100 level
                const level = Math.min(100, Math.round((avg / 64) * 100))
                setVoiceLevel(level)
                animFrameRef.current = requestAnimationFrame(tick)
            }
            tick()
        } catch (err) {
            console.warn('Volume meter init error:', err)
        }
    }

    const stopVolumeMeter = () => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current)
            animFrameRef.current = null
        }
        if (audioCtxRef.current) {
            try { audioCtxRef.current.close() } catch (_) {}
            audioCtxRef.current = null
        }
        if (mediaStreamRef.current) {
            try {
                mediaStreamRef.current.getTracks().forEach(t => t.stop())
            } catch (_) {}
            mediaStreamRef.current = null
        }
        setVoiceLevel(0)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Speech Recognition Core Initialization
    // ─────────────────────────────────────────────────────────────────────────
    startFnRef.current = () => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SR) {
            setVoiceError('Speech recognition is not supported in this browser. Please use Google Chrome.')
            return
        }
        if (stoppedRef.current) return

        if (recRef.current) {
            try { recRef.current.abort() } catch (_) {}
            recRef.current = null
        }

        const rec = new SR()
        rec.continuous      = true
        rec.interimResults  = true
        rec.lang            = navigator.language || 'en-US'
        rec.maxAlternatives = 1

        rec.onstart = () => {
            setIsListening(true)
            setVoiceError(null)
        }

        rec.onresult = (event) => {
            let sessionFinal = ''
            let sessionInterim = ''

            for (let i = 0; i < event.results.length; i++) {
                const result = event.results[i]
                if (result.isFinal) {
                    sessionFinal += result[0].transcript + ' '
                } else {
                    sessionInterim += result[0].transcript
                }
            }

            currentSessionFinalRef.current = sessionFinal

            const full = (baseTextRef.current + ' ' + sessionFinal + sessionInterim).replace(/\s+/g, ' ').trim()
            setTranscript(full)
            wordCountRef.current = full.split(/\s+/).filter(Boolean).length
        }

        rec.onerror = (event) => {
            console.warn('SpeechRecognition error:', event.error)
            if (event.error === 'no-speech' || event.error === 'aborted') {
                return   // Normal pause / abort
            }
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                setVoiceError('Microphone permission denied. Please allow mic access in browser settings.')
                stoppedRef.current = true
                setIsListening(false)
                stopVolumeMeter()
                return
            }
            if (event.error === 'network') {
                setVoiceError('Speech recognition network error. Retrying connection...')
            }
        }

        rec.onend = () => {
            recRef.current = null
            // Commit session final text to baseTextRef
            baseTextRef.current = (baseTextRef.current + ' ' + currentSessionFinalRef.current).replace(/\s+/g, ' ').trim()
            currentSessionFinalRef.current = ''

            if (!stoppedRef.current) {
                restartTimeoutRef.current = setTimeout(() => {
                    if (!stoppedRef.current) startFnRef.current?.()
                }, 200)
            } else {
                setIsListening(false)
                stopVolumeMeter()
            }
        }

        recRef.current = rec
        try {
            rec.start()
        } catch (err) {
            if (err.name === 'InvalidStateError') {
                restartTimeoutRef.current = setTimeout(() => {
                    if (!stoppedRef.current) startFnRef.current?.()
                }, 400)
            } else {
                console.error('SpeechRecognition start failed:', err)
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────
    const startVoiceAnalysis = useCallback(async () => {
        stoppedRef.current             = false
        baseTextRef.current            = ''
        currentSessionFinalRef.current = ''
        wordCountRef.current           = 0
        pauseRef.current               = 0
        startTimeRef.current           = Date.now()
        setTranscript('')
        setVoiceLevel(0)
        setVoiceError(null)

        if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current)

        // 1. First explicitly request microphone permission via getUserMedia
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            mediaStreamRef.current = stream
            startVolumeMeter(stream)
        } catch (err) {
            console.error('Microphone permission / access error:', err)
            setVoiceError('Microphone access denied or not available. Please allow mic access in your browser.')
            stoppedRef.current = true
            setIsListening(false)
            return
        }

        // 2. Start SpeechRecognition
        startFnRef.current?.()
    }, [])

    const stopVoiceAnalysis = useCallback(() => {
        stoppedRef.current = true
        if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current)

        if (recRef.current) {
            try { recRef.current.abort() } catch (_) {}
            recRef.current = null
        }
        stopVolumeMeter()
        setIsListening(false)
    }, [])

    const resetTranscript = useCallback(() => {
        baseTextRef.current            = ''
        currentSessionFinalRef.current = ''
        wordCountRef.current           = 0
        pauseRef.current               = 0
        startTimeRef.current           = Date.now()
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
