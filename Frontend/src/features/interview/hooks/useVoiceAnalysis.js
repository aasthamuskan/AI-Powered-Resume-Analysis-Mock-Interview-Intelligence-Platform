import { useRef, useState, useCallback } from 'react'

// ── Hook ─────────────────────────────────────────────────────────────────────
// Uses ONLY SpeechRecognition — no getUserMedia conflict with camera stream.
// Voice level is derived from speech activity, not AudioContext.
export function useVoiceAnalysis() {
    const recognitionRef  = useRef(null)
    const finalTextRef    = useRef('')
    const stoppedRef      = useRef(false)
    const initRecRef      = useRef(null)

    // Metrics tracking (no AudioContext needed)
    const wordCountRef    = useRef(0)
    const startTimeRef    = useRef(null)
    const pauseCountRef   = useRef(0)
    const lastResultRef   = useRef(null)

    const [transcript,  setTranscript]  = useState('')
    const [isListening, setIsListening] = useState(false)
    const [voiceLevel,  setVoiceLevel]  = useState(0)

    // ── SpeechRecognition init — stored in ref so onend can always call latest
    initRecRef.current = () => {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRec) {
            console.warn('SpeechRecognition not supported in this browser.')
            return
        }
        if (stoppedRef.current) return

        // Abort any existing instance
        if (recognitionRef.current) {
            try { recognitionRef.current.abort() } catch {}
        }

        const r = new SpeechRec()
        r.continuous      = true
        r.interimResults  = true
        r.lang            = 'en-US'
        r.maxAlternatives = 1

        r.onstart = () => {
            setIsListening(true)
            if (!startTimeRef.current) startTimeRef.current = Date.now()
        }

        r.onspeechstart = () => setVoiceLevel(75)
        r.onspeechend   = () => {
            setVoiceLevel(0)
            // Count pauses for metrics
            const now = Date.now()
            if (lastResultRef.current && now - lastResultRef.current > 1500) {
                pauseCountRef.current += 1
            }
        }

        r.onresult = (e) => {
            lastResultRef.current = Date.now()
            let interim = ''
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) {
                    finalTextRef.current += e.results[i][0].transcript + ' '
                    wordCountRef.current = finalTextRef.current.trim().split(/\s+/).filter(Boolean).length
                } else {
                    interim += e.results[i][0].transcript
                }
            }
            const full = finalTextRef.current + interim
            setTranscript(full)
            // Show voice level animation while getting results
            setVoiceLevel(Math.min(100, 40 + interim.length * 2))
        }

        r.onerror = (e) => {
            setVoiceLevel(0)
            if (e.error === 'no-speech' || e.error === 'aborted') return
            if (e.error === 'not-allowed') {
                console.error('Microphone permission denied.')
                stoppedRef.current = true
                setIsListening(false)
                return
            }
            console.warn('SpeechRecognition error:', e.error)
        }

        // Chrome stops after silence (~60s) — auto restart
        r.onend = () => {
            setVoiceLevel(0)
            if (!stoppedRef.current) {
                setTimeout(() => {
                    if (!stoppedRef.current) initRecRef.current?.()
                }, 300)
            } else {
                setIsListening(false)
            }
        }

        recognitionRef.current = r
        try {
            r.start()
        } catch (err) {
            console.warn('SpeechRecognition start error:', err)
            // If already started, abort and retry
            if (err.name === 'InvalidStateError') {
                try { recognitionRef.current?.abort() } catch {}
                setTimeout(() => initRecRef.current?.(), 500)
            }
        }
    }

    // ── Start ─────────────────────────────────────────────────────────────────
    const startVoiceAnalysis = useCallback(async () => {
        stoppedRef.current    = false
        finalTextRef.current  = ''
        wordCountRef.current  = 0
        pauseCountRef.current = 0
        startTimeRef.current  = Date.now()
        lastResultRef.current = null
        setTranscript('')
        setVoiceLevel(0)

        // Check mic permission first (non-blocking — just warms up the permission)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            // Stop the tracks immediately — SpeechRecognition manages its own stream
            stream.getTracks().forEach(t => t.stop())
        } catch (err) {
            if (err.name === 'NotAllowedError') {
                console.error('Mic permission denied — cannot start voice analysis')
                return
            }
            // Other errors (NotFoundError etc) — still try SpeechRecognition
            console.warn('getUserMedia warning:', err.message)
        }

        initRecRef.current?.()
    }, [])

    // ── Stop ─────────────────────────────────────────────────────────────────
    const stopVoiceAnalysis = useCallback(() => {
        stoppedRef.current = true
        if (recognitionRef.current) {
            try { recognitionRef.current.abort() } catch {}
            recognitionRef.current = null
        }
        setIsListening(false)
        setVoiceLevel(0)
    }, [])

    // ── Metrics ───────────────────────────────────────────────────────────────
    const getVoiceMetrics = useCallback(() => {
        const totalMs      = startTimeRef.current ? Date.now() - startTimeRef.current : 1000
        const totalSec     = totalMs / 1000
        const wordCount    = wordCountRef.current
        const speakingRate = wordCount > 0 ? Math.round((wordCount / totalSec) * 60) : 0
        const pauseRatio   = Math.min(pauseCountRef.current * 0.05, 0.5)

        return {
            speakingRate:     +speakingRate.toFixed(1),
            pauseRatio:       +pauseRatio.toFixed(3),
            rmsVariance:      0.02,   // not measured without AudioContext
            silenceCount:     pauseCountRef.current,
            totalDurationSec: +totalSec.toFixed(1),
            wordCount,
        }
    }, [])

    // ── Reset transcript between questions ────────────────────────────────────
    const resetTranscript = useCallback(() => {
        finalTextRef.current  = ''
        wordCountRef.current  = 0
        pauseCountRef.current = 0
        lastResultRef.current = null
        startTimeRef.current  = Date.now()
        setTranscript('')
        setVoiceLevel(0)
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
