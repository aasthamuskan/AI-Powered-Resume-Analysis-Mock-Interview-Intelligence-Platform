import { useRef, useState, useCallback } from 'react'

const SILENCE_THRESHOLD = 0.015   // RMS below this = silence

// ── Simple autocorrelation pitch estimate ─────────────────────────────────────
function estimatePitch(buffer, sampleRate) {
    const bufLen = buffer.length
    let rms = 0
    for (let i = 0; i < bufLen; i++) rms += buffer[i] * buffer[i]
    rms = Math.sqrt(rms / bufLen)
    if (rms < SILENCE_THRESHOLD) return 0

    let r1 = 0, r2 = bufLen - 1, threshold = 0.2
    for (let i = 0; i < bufLen / 2; i++) {
        if (Math.abs(buffer[i]) < threshold) { r1 = i; break }
    }
    for (let i = 1; i < bufLen / 2; i++) {
        if (Math.abs(buffer[bufLen - i]) < threshold) { r2 = bufLen - i; break }
    }
    const buf2 = buffer.slice(r1, r2)
    const len  = buf2.length
    const c = new Array(len).fill(0)
    for (let i = 0; i < len; i++) {
        for (let j = 0; j < len - i; j++) c[i] = c[i] + buf2[j] * buf2[j + i]
    }
    let d = 0
    while (c[d] > c[d + 1]) d++
    let maxval = -Infinity, maxpos = -1
    for (let i = d; i < len; i++) { if (c[i] > maxval) { maxval = c[i]; maxpos = i } }
    let T0 = maxpos
    const interpolated = (c[T0 + 1] - c[T0 - 1]) / (2 * (2 * c[T0] - c[T0 - 1] - c[T0 + 1]))
    return sampleRate / (T0 + interpolated) || 0
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useVoiceAnalysis() {
    const audioCtxRef     = useRef(null)
    const analyserRef     = useRef(null)
    const sourceRef       = useRef(null)
    const mediaStreamRef  = useRef(null)
    const rmsBufferRef    = useRef([])
    const pitchBufferRef  = useRef([])
    const silenceLogRef   = useRef([])
    const wordCountRef    = useRef(0)
    const startTimeRef    = useRef(null)
    const rafRef          = useRef(null)
    const lastSpeechRef   = useRef(null)
    const isInSilenceRef  = useRef(false)
    const silenceStartRef = useRef(null)

    const recognitionRef  = useRef(null)
    const finalTextRef    = useRef('')      // ← persist finalText across restarts
    const stoppedRef      = useRef(false)   // ← tracks intentional stop

    const [transcript,  setTranscript]  = useState('')
    const [isListening, setIsListening] = useState(false)
    const [voiceLevel,  setVoiceLevel]  = useState(0)

    // ── Internal: create and start a SpeechRecognition instance ──────────────
    const createAndStartRecognition = useCallback(() => {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRec || stoppedRef.current) return

        // Abort any existing instance first
        if (recognitionRef.current) {
            try { recognitionRef.current.abort() } catch {}
        }

        const recognition = new SpeechRec()
        recognition.continuous     = true
        recognition.interimResults = true
        recognition.lang           = 'en-US'
        recognition.maxAlternatives = 1

        recognition.onresult = (e) => {
            let interimText = ''
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) {
                    finalTextRef.current += e.results[i][0].transcript + ' '
                    wordCountRef.current = finalTextRef.current.trim().split(/\s+/).filter(Boolean).length
                } else {
                    interimText += e.results[i][0].transcript
                }
            }
            setTranscript(finalTextRef.current + interimText)
        }

        recognition.onerror = (e) => {
            // 'no-speech' and 'aborted' are expected — just restart
            if (e.error === 'no-speech' || e.error === 'aborted') return
            console.warn('SpeechRecognition error:', e.error)
        }

        // Auto-restart on end (Chrome stops after ~60s of continuous mode)
        recognition.onend = () => {
            if (!stoppedRef.current) {
                // Small delay then restart to avoid rapid loop
                setTimeout(() => {
                    if (!stoppedRef.current) createAndStartRecognition()
                }, 300)
            } else {
                setIsListening(false)
            }
        }

        recognitionRef.current = recognition
        try {
            recognition.start()
            setIsListening(true)
        } catch (err) {
            console.warn('SpeechRecognition start error:', err)
        }
    }, [])

    // ── Start audio analysis + speech recognition ────────────────────────────
    const startVoiceAnalysis = useCallback(async () => {
        try {
            stoppedRef.current = false
            finalTextRef.current = ''

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            mediaStreamRef.current = stream

            const AudioContext = window.AudioContext || window.webkitAudioContext
            audioCtxRef.current  = new AudioContext()
            const analyser       = audioCtxRef.current.createAnalyser()
            analyser.fftSize     = 2048
            analyserRef.current  = analyser

            const source = audioCtxRef.current.createMediaStreamSource(stream)
            source.connect(analyser)
            sourceRef.current = source

            rmsBufferRef.current   = []
            pitchBufferRef.current = []
            silenceLogRef.current  = []
            wordCountRef.current   = 0
            startTimeRef.current   = Date.now()
            isInSilenceRef.current = false

            // ── Audio analysis loop ───────────────────────────────────────────
            const dataArray = new Float32Array(analyser.fftSize)
            function audioLoop() {
                if (!analyserRef.current) return
                analyser.getFloatTimeDomainData(dataArray)

                let sumSq = 0
                for (let i = 0; i < dataArray.length; i++) sumSq += dataArray[i] * dataArray[i]
                const rms = Math.sqrt(sumSq / dataArray.length)
                rmsBufferRef.current.push(rms)
                setVoiceLevel(Math.min(100, Math.round(rms * 500)))

                const now = Date.now()
                if (rms < SILENCE_THRESHOLD) {
                    if (!isInSilenceRef.current) {
                        isInSilenceRef.current = true
                        silenceStartRef.current = now
                    }
                } else {
                    if (isInSilenceRef.current) {
                        const silenceDur = now - silenceStartRef.current
                        if (silenceDur > 800) {
                            silenceLogRef.current.push({ start: silenceStartRef.current, end: now, dur: silenceDur })
                        }
                        isInSilenceRef.current = false
                    }
                    lastSpeechRef.current = now
                }

                const pitch = estimatePitch(dataArray, audioCtxRef.current?.sampleRate || 44100)
                if (pitch > 60 && pitch < 400) pitchBufferRef.current.push(pitch)

                rafRef.current = requestAnimationFrame(audioLoop)
            }
            rafRef.current = requestAnimationFrame(audioLoop)

            // ── Start speech recognition ──────────────────────────────────────
            createAndStartRecognition()

        } catch (err) {
            console.error('Voice analysis start error:', err)
        }
    }, [createAndStartRecognition])

    // ── Stop ─────────────────────────────────────────────────────────────────
    const stopVoiceAnalysis = useCallback(() => {
        stoppedRef.current = true

        cancelAnimationFrame(rafRef.current)
        rafRef.current = null

        if (recognitionRef.current) {
            try { recognitionRef.current.abort() } catch {}
            recognitionRef.current = null
        }

        setIsListening(false)
        setVoiceLevel(0)

        if (audioCtxRef.current) {
            sourceRef.current?.disconnect()
            try { audioCtxRef.current.close() } catch {}
            audioCtxRef.current = null
            analyserRef.current = null
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(t => t.stop())
            mediaStreamRef.current = null
        }
    }, [])

    // ── Compute final metrics ─────────────────────────────────────────────────
    const getVoiceMetrics = useCallback(() => {
        const totalMs      = startTimeRef.current ? Date.now() - startTimeRef.current : 1
        const totalSec     = totalMs / 1000
        const wordCount    = wordCountRef.current
        const speakingRate = wordCount > 0 ? Math.round((wordCount / totalSec) * 60) : 0

        const silences     = silenceLogRef.current
        const totalSilMs   = silences.reduce((acc, s) => acc + s.dur, 0)
        const pauseRatio   = totalSilMs / Math.max(totalMs, 1)
        const silenceCount = silences.length

        const rmsVals    = rmsBufferRef.current
        const rmsMean    = rmsVals.length > 0 ? rmsVals.reduce((a, b) => a + b, 0) / rmsVals.length : 0
        const rmsVariance = rmsVals.length > 0
            ? rmsVals.reduce((acc, v) => acc + (v - rmsMean) ** 2, 0) / rmsVals.length
            : 0

        return {
            speakingRate:     +speakingRate.toFixed(1),
            pauseRatio:       +pauseRatio.toFixed(3),
            rmsVariance:      +rmsVariance.toFixed(4),
            silenceCount,
            totalDurationSec: +totalSec.toFixed(1),
            wordCount,
        }
    }, [])

    const resetTranscript = useCallback(() => {
        finalTextRef.current   = ''
        setTranscript('')
        wordCountRef.current   = 0
        rmsBufferRef.current   = []
        pitchBufferRef.current = []
        silenceLogRef.current  = []
        startTimeRef.current   = Date.now()
    }, [])

    return {
        transcript,
        isListening,
        voiceLevel,
        startVoiceAnalysis,
        stopVoiceAnalysis,
        getVoiceMetrics,
        resetTranscript,
    }
}
