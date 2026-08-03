import { useRef, useState, useCallback, useEffect } from 'react'
import * as faceapi from 'face-api.js'

const MODEL_URL      = '/models'
const DETECT_MS      = 350   // run detection every 350ms (≈3fps) to avoid UI freeze
const SAMPLE_EVERY_N = 2     // collect a sample every 2 detection runs

// ── Eye-contact proxy from 68-point landmarks ─────────────────────────────────
function estimateEyeContact(landmarks) {
    if (!landmarks) return true
    try {
        const pts = landmarks.positions
        const faceW = Math.abs(pts[16].x - pts[0].x)  // face width from ear to ear
        const lEye  = { x: (pts[36].x + pts[39].x) / 2, y: (pts[36].y + pts[39].y) / 2 }
        const rEye  = { x: (pts[42].x + pts[45].x) / 2, y: (pts[42].y + pts[45].y) / 2 }
        const nose  = pts[30]
        const eyeCx = (lEye.x + rEye.x) / 2
        const devX  = Math.abs(nose.x - eyeCx) / (faceW || 1)
        return devX < 0.22   // within 22% deviation = looking at camera
    } catch { return true }
}

// ── Nervousness score (0–100) ─────────────────────────────────────────────────
function computeNervousness(expressions, isLookingAway) {
    const { fearful = 0, sad = 0, disgusted = 0 } = expressions
    const base    = fearful * 0.5 + sad * 0.25 + disgusted * 0.15
    const lookAway = isLookingAway ? 0.10 : 0
    return Math.min(100, (base + lookAway) * 100)
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────
export function useFaceAnalysis() {
    const videoRef        = useRef(null)
    const canvasRef       = useRef(null)
    const previewVideoRef = useRef(null)   // setup-screen preview (separate from main body)
    const streamRef       = useRef(null)
    const timerRef        = useRef(null)   // setTimeout handle (not rAF)
    const isDetectingRef  = useRef(false)  // busy flag – prevents overlapping calls
    const runningRef      = useRef(false)  // loop alive flag
    const samplesRef      = useRef([])
    const runCountRef     = useRef(0)

    const [modelsLoaded,     setModelsLoaded]     = useState(false)
    const [cameraReady,      setCameraReady]       = useState(false)
    const [faceDetected,     setFaceDetected]      = useState(false)
    const [currentExpression,setCurrentExpression] = useState('neutral')
    const [nervousnessScore, setNervousnessScore]  = useState(0)
    const [eyeContactPct,    setEyeContactPct]     = useState(100)
    const [loadError,        setLoadError]         = useState(null)

    // ── Load models once ──────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false
        async function load() {
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
                ])
                if (cancelled) return

                // Warm up TF.js backend with a tiny canvas to avoid first-run freeze
                try {
                    const warm = document.createElement('canvas')
                    warm.width = 64; warm.height = 64
                    await faceapi.detectSingleFace(warm, new faceapi.TinyFaceDetectorOptions())
                } catch (_) { /* ignore warmup errors */ }

                if (!cancelled) setModelsLoaded(true)
            } catch (err) {
                if (!cancelled) setLoadError('Failed to load face detection models.')
                console.error('face-api.js model load error:', err)
            }
        }
        load()
        return () => { cancelled = true }
    }, [])

    // ── Start webcam ──────────────────────────────────────────────────────────
    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 480 }, height: { ideal: 360 }, facingMode: 'user' },
                audio: false,
            })
            streamRef.current = stream

            // Preview video (setup screen)
            if (previewVideoRef.current) {
                previewVideoRef.current.srcObject = stream
                await previewVideoRef.current.play().catch(() => {})
            }
            // Main body video (if already mounted)
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                await videoRef.current.play().catch(() => {})
            }

            setCameraReady(true)
        } catch (err) {
            setLoadError('Camera access denied. Please allow camera permissions.')
            console.error('getUserMedia error:', err)
            throw err
        }
    }, [])

    // ── Stop webcam ───────────────────────────────────────────────────────────
    const stopCamera = useCallback(() => {
        runningRef.current = false
        clearTimeout(timerRef.current)
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop())
            streamRef.current = null
        }
        setCameraReady(false)
    }, [])

    // ── Attach existing stream to main video (called after stage→'live') ──────
    const attachStreamToMainVideo = useCallback(() => {
        if (videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current
            videoRef.current.play().catch(() => {})
        }
    }, [])

    // ── Throttled detection loop ──────────────────────────────────────────────
    const startDetection = useCallback(() => {
        if (!modelsLoaded) {
            console.warn('useFaceAnalysis: models not loaded yet')
            return
        }
        samplesRef.current = []
        runCountRef.current = 0
        runningRef.current = true
        isDetectingRef.current = false

        async function detect() {
            // Stop if unmounted or paused
            if (!runningRef.current) return
            if (isDetectingRef.current) {
                timerRef.current = setTimeout(detect, DETECT_MS)
                return
            }

            const video  = videoRef.current
            const canvas = canvasRef.current

            // Video not ready yet — retry
            if (!video || !canvas || video.paused || video.ended || video.readyState < 2 || !video.videoWidth) {
                timerRef.current = setTimeout(detect, DETECT_MS)
                return
            }

            isDetectingRef.current = true
            try {
                faceapi.matchDimensions(canvas, { width: video.videoWidth, height: video.videoHeight })

                const result = await faceapi
                    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.35, inputSize: 224 }))
                    .withFaceLandmarks(true)
                    .withFaceExpressions()

                if (!runningRef.current) { isDetectingRef.current = false; return }

                if (result) {
                    setFaceDetected(true)

                    const { expressions, landmarks } = result
                    const isLookingAway = !estimateEyeContact(landmarks)
                    const nervousness   = computeNervousness(expressions, isLookingAway)

                    // Top expression
                    const topExpr = Object.entries(expressions).sort((a, b) => b[1] - a[1])[0][0]
                    setCurrentExpression(topExpr)

                    // Smoothed nervousness
                    setNervousnessScore(prev => +(prev * 0.65 + nervousness * 0.35).toFixed(1))

                    // Collect sample every SAMPLE_EVERY_N runs
                    runCountRef.current++
                    if (runCountRef.current % SAMPLE_EVERY_N === 0) {
                        samplesRef.current.push({
                            time: Date.now(),
                            expressions: { ...expressions },
                            isLookingAway,
                            nervousness,
                        })
                        const total   = samplesRef.current.length
                        const looking = samplesRef.current.filter(s => !s.isLookingAway).length
                        setEyeContactPct(Math.round((looking / total) * 100))
                    }

                    // Draw landmarks overlay
                    const ctx = canvas.getContext('2d')
                    ctx.clearRect(0, 0, canvas.width, canvas.height)
                    const resized = faceapi.resizeResults(result, { width: video.videoWidth, height: video.videoHeight })
                    faceapi.draw.drawFaceLandmarks(canvas, resized)

                } else {
                    setFaceDetected(false)
                    const ctx = canvasRef.current?.getContext('2d')
                    if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
                }
            } catch (err) {
                console.warn('Face detection error (non-fatal):', err.message)
            }

            isDetectingRef.current = false
            if (runningRef.current) {
                timerRef.current = setTimeout(detect, DETECT_MS)
            }
        }

        // Small initial delay so video gets first frame
        timerRef.current = setTimeout(detect, 500)
    }, [modelsLoaded])

    // ── Stop detection ────────────────────────────────────────────────────────
    const stopDetection = useCallback(() => {
        runningRef.current = false
        clearTimeout(timerRef.current)
    }, [])

    // ── Compute final metrics from samples ────────────────────────────────────
    const getExpressionMetrics = useCallback(() => {
        const samples = samplesRef.current
        if (samples.length === 0) {
            return { nervousnessScore: 0, eyeContactRatio: 1, avgFearful: 0, avgHappy: 0.5, avgNeutral: 0.5, expressionChanges: 0, dominantExpression: 'neutral' }
        }

        const avg = key => samples.reduce((acc, s) => acc + (s.expressions[key] || 0), 0) / samples.length

        const avgFearful = avg('fearful')
        const avgHappy   = avg('happy')
        const avgNeutral = avg('neutral')
        const looking    = samples.filter(s => !s.isLookingAway).length
        const eyeContactRatio   = looking / samples.length
        const avgNervousness    = samples.reduce((acc, s) => acc + s.nervousness, 0) / samples.length

        // Count dominant expression changes
        let expressionChanges = 0
        for (let i = 1; i < samples.length; i++) {
            const prev = Object.entries(samples[i - 1].expressions).sort((a, b) => b[1] - a[1])[0][0]
            const curr = Object.entries(samples[i].expressions).sort((a, b) => b[1] - a[1])[0][0]
            if (prev !== curr) expressionChanges++
        }

        const domCounts = {}
        samples.forEach(s => {
            const top = Object.entries(s.expressions).sort((a, b) => b[1] - a[1])[0][0]
            domCounts[top] = (domCounts[top] || 0) + 1
        })
        const dominantExpression = Object.entries(domCounts).sort((a, b) => b[1] - a[1])[0][0]

        return {
            nervousnessScore:  +avgNervousness.toFixed(2),
            eyeContactRatio:   +eyeContactRatio.toFixed(3),
            avgFearful:        +avgFearful.toFixed(3),
            avgHappy:          +avgHappy.toFixed(3),
            avgNeutral:        +avgNeutral.toFixed(3),
            expressionChanges,
            dominantExpression,
        }
    }, [])

    const resetSamples = useCallback(() => {
        samplesRef.current  = []
        runCountRef.current = 0
    }, [])

    return {
        videoRef,
        canvasRef,
        previewVideoRef,
        modelsLoaded,
        cameraReady,
        faceDetected,
        currentExpression,
        nervousnessScore,
        eyeContactPct,
        loadError,
        startCamera,
        stopCamera,
        attachStreamToMainVideo,
        startDetection,
        stopDetection,
        getExpressionMetrics,
        resetSamples,
    }
}
