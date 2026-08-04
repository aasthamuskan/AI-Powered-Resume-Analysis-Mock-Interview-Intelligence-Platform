import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { useInterview } from '../hooks/useInterview'
import { useFaceAnalysis } from '../hooks/useFaceAnalysis'
import { useVoiceAnalysis } from '../hooks/useVoiceAnalysis'
import '../style/faceinterview.scss'

// ── Icons ──────────────────────────────────────────────────────────────────────
const IconMic     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
const IconMicOff  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
const IconVideo   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
const IconVideoOff= () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
const IconPhone   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.43 9.88a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.34 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.3 8.93"/></svg>
const IconCheck   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
const IconArrow   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
const IconHome    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
const IconEye     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
const IconZap     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
const IconBrain   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>
const IconShield  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
const IconSpeaker = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
const IconList    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>

// ── Helpers ────────────────────────────────────────────────────────────────────
const EXPR_MAP = {
    neutral:   { emoji: '🎯', label: 'Focused'    },
    happy:     { emoji: '😊', label: 'Confident'  },
    fearful:   { emoji: '😰', label: 'Nervous'    },
    sad:       { emoji: '😔', label: 'Hesitant'   },
    surprised: { emoji: '😲', label: 'Surprised'  },
    disgusted: { emoji: '😤', label: 'Frustrated' },
    angry:     { emoji: '😠', label: 'Tense'      },
}

function nervousnessLevel(score) {
    if (score < 30) return 'calm'
    if (score < 60) return 'mild'
    return 'nervous'
}

function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0')
    const s = (sec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
}

function scoreColorClass(v) { return v >= 8 ? 'high' : v >= 6 ? 'mid' : 'low' }

function genSessionId() {
    return 'PR-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 5).toUpperCase()
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const FaceInterview = () => {
    const { interviewId } = useParams()
    const navigate        = useNavigate()
    const { report, getReportById, evaluateFaceInterview } = useInterview()

    // ── State ─────────────────────────────────────────────────────────────────
    const [stage,           setStage]           = useState('setup')
    const [sessionSec,      setSessionSec]      = useState(0)
    const [answerSec,       setAnswerSec]       = useState(120)
    const [qIndex,          setQIndex]          = useState(0)
    const [answer,          setAnswer]          = useState('')
    const [isEvaluating,    setIsEvaluating]    = useState(false)
    const [isSpeaking,      setIsSpeaking]      = useState(false)
    const [aiStatus,        setAiStatus]        = useState('idle')
    const [feedback,        setFeedback]        = useState(null)
    const [transcript_history, setTranscriptHistory] = useState([])
    const [sessionResults,  setSessionResults]  = useState([])
    const [camPermission,   setCamPermission]   = useState('pending')
    const [micPermission,   setMicPermission]   = useState('pending')
    const [ttsEnabled,      setTtsEnabled]      = useState(true)
    const [micMuted,        setMicMuted]        = useState(false)
    const [showTranscript,  setShowTranscript]  = useState(false)
    const [sessionId]                           = useState(genSessionId)

    // ── Refs ──────────────────────────────────────────────────────────────────
    const timerRef       = useRef(null)
    const answerTimerRef = useRef(null)
    const synthRef       = useRef(window.speechSynthesis)
    // CRITICAL: declare handleSubmitRef BEFORE any useEffect that uses it
    const handleSubmitRef = useRef(null)

    // ── Hooks ─────────────────────────────────────────────────────────────────
    const {
        videoRef, canvasRef, previewVideoRef,
        modelsLoaded, cameraReady, faceDetected,
        currentExpression, nervousnessScore, eyeContactPct,
        loadError: faceError,
        startCamera, stopCamera, attachStreamToMainVideo,
        startDetection, stopDetection,
        getExpressionMetrics, resetSamples,
    } = useFaceAnalysis()

    const {
        transcript, isListening, voiceLevel,
        startVoiceAnalysis, stopVoiceAnalysis,
        getVoiceMetrics, resetTranscript,
    } = useVoiceAnalysis()

    // ── Load report ───────────────────────────────────────────────────────────
    useEffect(() => { if (interviewId) getReportById(interviewId) }, [interviewId])

    // Sync voice → answer textarea
    useEffect(() => { if (transcript && isListening) setAnswer(transcript) }, [transcript, isListening])

    // ── Questions ─────────────────────────────────────────────────────────────
    const allQuestions = report ? [
        ...(report.technicalQuestions  || []).map(q => ({ ...q, type: 'technical' })),
        ...(report.behavioralQuestions || []).map(q => ({ ...q, type: 'behavioral' })),
    ] : []

    const currentQ = allQuestions[qIndex]

    // ── Session timer ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (stage === 'live') timerRef.current = setInterval(() => setSessionSec(s => s + 1), 1000)
        else clearInterval(timerRef.current)
        return () => clearInterval(timerRef.current)
    }, [stage])

    // ── Per-question answer countdown ─────────────────────────────────────────
    useEffect(() => {
        clearInterval(answerTimerRef.current)
        if (stage !== 'live' || feedback || isEvaluating) return
        setAnswerSec(120)
        answerTimerRef.current = setInterval(() => {
            setAnswerSec(prev => {
                if (prev <= 1) {
                    clearInterval(answerTimerRef.current)
                    handleSubmitRef.current?.()   // safe: ref checked before call
                    return 0
                }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(answerTimerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stage, qIndex, feedback, isEvaluating])

    // ── TTS ───────────────────────────────────────────────────────────────────
    const speakQuestion = useCallback((text) => {
        synthRef.current?.cancel()
        setIsSpeaking(false)
        setAiStatus('idle')
        if (!ttsEnabled || !synthRef.current) return
        const utt = new SpeechSynthesisUtterance(text)
        utt.rate = 0.88; utt.pitch = 1.05; utt.volume = 1
        const voices = synthRef.current.getVoices()
        const v = voices.find(v => v.name.includes('Google UK English Male') || v.name.includes('Daniel') || v.lang === 'en-US')
        if (v) utt.voice = v
        utt.onstart = () => { setIsSpeaking(true);  setAiStatus('speaking') }
        utt.onend   = () => { setIsSpeaking(false); setAiStatus('listening') }
        utt.onerror = () => { setIsSpeaking(false); setAiStatus('listening') }
        synthRef.current.speak(utt)
    }, [ttsEnabled])

    // ── Start session ─────────────────────────────────────────────────────────
    const handleStartSession = useCallback(() => {
        setStage('live')
        setTimeout(() => attachStreamToMainVideo(), 150)
        setTimeout(() => startDetection(), 600)
        setTimeout(() => startVoiceAnalysis(), 300)
        if (allQuestions.length > 0) {
            const q = allQuestions[0]
            setTimeout(() => speakQuestion(`Question 1. ${q.type === 'technical' ? 'Technical question.' : 'Behavioral question.'} ${q.question}`), 900)
            setTranscriptHistory([{ who: 'ai', text: q.question }])
        }
    }, [allQuestions, attachStreamToMainVideo, startDetection, startVoiceAnalysis, speakQuestion])

    // ── Submit answer ─────────────────────────────────────────────────────────
    const handleSubmit = useCallback(async () => {
        if (!currentQ || isEvaluating) return
        clearInterval(answerTimerRef.current)
        stopVoiceAnalysis()
        const expressionMetrics = getExpressionMetrics()
        const voiceMetrics      = getVoiceMetrics()
        const answerText        = answer.trim() || transcript.trim()
        setTranscriptHistory(prev => [...prev, { who: 'user', text: answerText || '(no answer — evaluated on behavior)' }])
        setIsEvaluating(true)
        setAiStatus('thinking')
        setFeedback(null)
        try {
            const result = await evaluateFaceInterview({ question: currentQ.question, transcript: answerText, expressionMetrics, voiceMetrics, interviewId, questionType: currentQ.type })
            setFeedback(result)
            setAiStatus('speaking')
            setSessionResults(prev => [...prev, { question: currentQ.question, type: currentQ.type, ...result }])
            setTranscriptHistory(prev => [...prev, { who: 'ai', text: result.contentFeedback, score: result.overallScore, verdict: result.verdict }])
            speakQuestion(`Good effort. Overall score ${result.overallScore} out of 10. ${result.behaviorFeedback}`)
        } catch (err) {
            console.error('Face eval error:', err)
            setTranscriptHistory(prev => [...prev, { who: 'ai', text: 'Evaluation failed. Please try again.' }])
        } finally {
            setIsEvaluating(false)
        }
    }, [currentQ, isEvaluating, answer, transcript, getExpressionMetrics, getVoiceMetrics, evaluateFaceInterview, interviewId, speakQuestion, stopVoiceAnalysis])

    // Keep ref always current (synchronous update — correct pattern)
    handleSubmitRef.current = handleSubmit

    // ── Next question ─────────────────────────────────────────────────────────
    const handleNext = useCallback(() => {
        if (qIndex + 1 >= allQuestions.length) {
            synthRef.current?.cancel(); stopDetection(); stopCamera(); stopVoiceAnalysis()
            setStage('complete'); return
        }
        const next = allQuestions[qIndex + 1]
        setQIndex(qi => qi + 1); setAnswer(''); setFeedback(null)
        resetSamples(); resetTranscript(); startVoiceAnalysis()
        setTimeout(() => speakQuestion(`Question ${qIndex + 2}. ${next.type === 'technical' ? 'Technical.' : 'Behavioral.'} ${next.question}`), 400)
        setTranscriptHistory(prev => [...prev, { who: 'ai', text: next.question }])
    }, [qIndex, allQuestions, stopDetection, stopCamera, stopVoiceAnalysis, resetSamples, resetTranscript, startVoiceAnalysis, speakQuestion])

    const handleEndSession = useCallback(() => {
        synthRef.current?.cancel(); stopDetection(); stopCamera(); stopVoiceAnalysis()
        setStage('complete')
    }, [stopDetection, stopCamera, stopVoiceAnalysis])

    const handleSkip = useCallback(() => {
        setSessionResults(prev => [...prev, { question: currentQ?.question, type: currentQ?.type, overallScore: 0, verdict: 'needs_work', skipped: true }])
        if (qIndex + 1 >= allQuestions.length) { handleEndSession(); return }
        handleNext()
    }, [qIndex, allQuestions, currentQ, handleNext, handleEndSession])

    // ── Request permissions ───────────────────────────────────────────────────
    const handleRequestPermissions = useCallback(async () => {
        try { await startCamera(); setCamPermission('granted'); setMicPermission('granted') }
        catch { setCamPermission('denied'); setMicPermission('denied') }
    }, [startCamera])

    // ── Completion stats ──────────────────────────────────────────────────────
    const completionStats = (() => {
        const answered = sessionResults.filter(r => !r.skipped)
        if (!answered.length) return { overall: 0, content: 0, confidence: 0, communication: 0, eyeContact: 0 }
        const avg = key => Math.round(answered.reduce((a, r) => a + (r[key] || 0), 0) / answered.length)
        return { overall: avg('overallScore'), content: avg('contentScore'), confidence: avg('confidenceScore'), communication: avg('communicationScore'), eyeContact: avg('eyeContactScore') }
    })()

    const timerCls = answerSec <= 30 ? 'danger' : answerSec <= 60 ? 'warning' : 'ok'

    // ── Loading ───────────────────────────────────────────────────────────────
    if (!report) return (
        <div className="fi-page">
            <div className="fi-loading"><div className="fi-spinner"/><p>Loading interview session...</p></div>
        </div>
    )

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="fi-page">

            {/* ── TOP BAR ──────────────────────────────────────────────────── */}
            <header className="fi-topbar">
                <div className="fi-topbar__brand">
                    <IconBrain />
                    <span>PrepIQ</span>
                </div>

                <div className="fi-topbar__center">
                    {stage === 'live' && (
                        <>
                            <span className="fi-topbar__live-dot"/>
                            <span className="fi-topbar__live-label">LIVE INTERVIEW</span>
                        </>
                    )}
                    {stage === 'setup' && <span className="fi-topbar__live-label" style={{ color: 'rgba(255,255,255,0.3)' }}>SETUP</span>}
                    {stage === 'complete' && <span className="fi-topbar__live-label" style={{ color: '#10B981' }}>SESSION COMPLETE</span>}
                </div>

                <div className="fi-topbar__right">
                    <span className="fi-topbar__badge">AI</span>
                    <span className="fi-topbar__badge">HD</span>
                    {stage === 'live' && (
                        <>
                            <span className="fi-topbar__q-count">{qIndex + 1}/{allQuestions.length}</span>
                            <span className="fi-topbar__session-timer">{formatTime(sessionSec)}</span>
                        </>
                    )}
                    <span className="fi-topbar__session">{sessionId}</span>
                    <div className="fi-topbar__conn">
                        <span/><span/><span/>
                    </div>
                </div>
            </header>

            {/* ── TWO-PANEL MAIN ────────────────────────────────────────────── */}
            <main className="fi-main">

                {/* LEFT — AI Interviewer ──────────────────────────────────── */}
                <section className={`fi-panel fi-panel--ai ${isSpeaking ? 'fi-panel--speaking' : ''}`}>

                    {/* Avatar fill */}
                    <div className="fi-ai-fill">
                        <img src="/ai_avatar.png" alt="AI Interviewer" />
                    </div>

                    {/* Speaking glow ring */}
                    {isSpeaking && <div className="fi-speak-ring"/>}

                    {/* Security badge overlay */}
                    <div className="fi-security">
                        <div className="fi-security__title">
                            <IconShield/>
                            SECURITY PROTOCOL
                        </div>
                        <div className="fi-security__row">
                            <span className="fi-security__label">Liveness Check</span>
                            <span className="fi-security__status fi-security__status--active">ACTIVE</span>
                        </div>
                        <div className="fi-security__row">
                            <span className="fi-security__label">Face Matching</span>
                            <span className="fi-security__status fi-security__status--scanning">SCAN</span>
                        </div>
                        <div className="fi-security__row">
                            <span className="fi-security__label">Behavioral Scan</span>
                            <span className="fi-security__status fi-security__status--pending">PENDING</span>
                        </div>
                    </div>

                    {/* Current question as caption */}
                    {currentQ && stage === 'live' && (
                        <div className="fi-question-caption">
                            <p className="fi-question-caption__text">
                                &ldquo;{currentQ.question}&rdquo;
                            </p>
                        </div>
                    )}

                    {/* Panel label */}
                    <div className="fi-panel__label">AI Interviewer</div>

                    {/* AI status chip */}
                    {stage === 'live' && (
                        <div className={`fi-ai-status fi-ai-status--${aiStatus}`}>
                            {aiStatus === 'speaking'  && '🔊 Speaking'}
                            {aiStatus === 'listening' && '👂 Listening'}
                            {aiStatus === 'thinking'  && '🤔 Analyzing'}
                            {aiStatus === 'idle'      && '● Ready'}
                        </div>
                    )}

                    {/* Thinking overlay on AI panel */}
                    {isEvaluating && (
                        <div className="fi-thinking">
                            <div className="fi-thinking__ring"/>
                            <span className="fi-thinking__label">Analyzing response...</span>
                        </div>
                    )}
                </section>

                {/* RIGHT — Candidate ──────────────────────────────────────── */}
                <section className="fi-panel fi-panel--candidate">

                    {/* Webcam fill */}
                    <div className={`fi-cam-fill fi-cam-fill--${nervousnessLevel(nervousnessScore)}`}>
                        <video ref={videoRef} autoPlay muted playsInline/>
                        <canvas ref={canvasRef}/>
                    </div>

                    {/* Integrity score overlay */}
                    <div className="fi-integrity">
                        <div className="fi-integrity__title">INTEGRITY SCORE</div>
                        <div className="fi-integrity__score">
                            {isEvaluating ? 'Analyzing...' : feedback ? `${feedback.overallScore}/10` : 'Pending |||'}
                        </div>
                        <div className="fi-integrity__sub">
                            {isEvaluating
                                ? 'Processing biometric & verbal data...'
                                : 'Analyzing biometric consistency and verbal sentiment...'}
                        </div>
                    </div>

                    {/* Expression badge */}
                    {faceDetected && stage === 'live' && (
                        <div className="fi-expr-badge">
                            {EXPR_MAP[currentExpression]?.emoji || '🎯'} {EXPR_MAP[currentExpression]?.label || 'Focused'}
                        </div>
                    )}

                    {/* No face warning */}
                    {!faceDetected && stage === 'live' && (
                        <div className="fi-no-face">⚠ Face not detected — center yourself in frame</div>
                    )}

                    {/* Live transcript / answer area */}
                    {stage === 'live' && !feedback && (
                        <div className="fi-live-answer">
                            {isListening && (
                                <div className="fi-live-answer__status">
                                    <span className="fi-live-answer__dot"/>
                                    REC
                                </div>
                            )}
                            <div className={`fi-live-answer__bar ${isListening ? 'fi-live-answer__bar--listening' : ''}`}>
                                {transcript || answer || (
                                    <span className="placeholder">Start speaking — your answer appears here automatically...</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Feedback overlay on candidate panel */}
                    {feedback && (
                        <div className="fi-feedback-overlay">
                            <div className="fi-feedback-header">
                                <h4>AI Evaluation</h4>
                                <div className="fi-score-big">
                                    <span className={`fi-score-big__num fi-score-big__num--${feedback.verdict}`}>{feedback.overallScore}</span>
                                    <span className="fi-score-big__denom">/10</span>
                                    <span className={`fi-score-big__verdict fi-score-big__verdict--${feedback.verdict}`}>{feedback.verdict?.replace('_', ' ')}</span>
                                </div>
                            </div>

                            <div className="fi-score-grid">
                                {[
                                    { label: 'Content',     val: feedback.contentScore },
                                    { label: 'Confidence',  val: feedback.confidenceScore },
                                    { label: 'Comm.',       val: feedback.communicationScore },
                                    { label: 'Eye Contact', val: feedback.eyeContactScore },
                                ].map(({ label, val }) => (
                                    <div key={label} className="fi-score-cell">
                                        <div className="fi-score-cell__label">{label}</div>
                                        <div className={`fi-score-cell__val fi-score-cell__val--${scoreColorClass(val)}`}>
                                            {val}<span>/10</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {feedback.behaviorInsights?.length > 0 && (
                                <div className="fi-behavior-insights">
                                    {feedback.behaviorInsights.map((b, i) => (
                                        <div key={i} className={`fi-insight fi-insight--${b.type}`}>{b.insight}</div>
                                    ))}
                                </div>
                            )}

                            <div className="fi-feedback-text">{feedback.contentFeedback}</div>

                            {feedback.improvements?.length > 0 && (
                                <div className="fi-improvements">
                                    {feedback.improvements.map((imp, i) => (
                                        <div key={i} className="fi-improvement">{imp}</div>
                                    ))}
                                </div>
                            )}

                            <button className="fi-feedback-next" onClick={handleNext}>
                                {qIndex + 1 >= allQuestions.length ? <><IconCheck/> Finish Session</> : <>Next Question <IconArrow/></>}
                            </button>
                        </div>
                    )}

                    {/* Panel label */}
                    <div className="fi-panel__label fi-panel__label--right">You (Verified Candidate)</div>
                </section>
            </main>

            {/* ── CONTROL BAR ──────────────────────────────────────────────── */}
            <footer className="fi-controls">
                {/* Left group */}
                <div className="fi-ctrl-group">
                    <Link to={`/interview/${interviewId}`} className="fi-ctrl-text-btn">← Dashboard</Link>
                </div>

                {/* Center group */}
                <div className="fi-ctrl-group fi-ctrl-group--center">
                    {/* Answer timer */}
                    {stage === 'live' && !feedback && (
                        <span className={`fi-ctrl-timer fi-ctrl-timer--${timerCls}`}>
                            ⏱ {formatTime(answerSec)}
                        </span>
                    )}

                    <div className="fi-ctrl-divider"/>

                    {/* Mic */}
                    <button
                        className={`fi-ctrl-btn ${isListening && !micMuted ? 'fi-ctrl-btn--active' : ''} ${micMuted ? 'fi-ctrl-btn--muted' : ''}`}
                        onClick={() => setMicMuted(m => !m)}
                        title={micMuted ? 'Unmute' : 'Mute'}
                    >
                        {micMuted ? <IconMicOff/> : <IconMic/>}
                    </button>

                    {/* Camera */}
                    <button className="fi-ctrl-btn fi-ctrl-btn--active" title="Camera">
                        <IconVideo/>
                    </button>

                    {/* Speaker / TTS */}
                    <button
                        className={`fi-ctrl-btn ${ttsEnabled ? 'fi-ctrl-btn--active' : ''}`}
                        onClick={() => { setTtsEnabled(v => !v); synthRef.current?.cancel() }}
                        title={ttsEnabled ? 'Disable AI voice' : 'Enable AI voice'}
                    >
                        <IconSpeaker/>
                    </button>

                    {/* Transcript */}
                    <button
                        className={`fi-ctrl-btn ${showTranscript ? 'fi-ctrl-btn--active' : ''}`}
                        onClick={() => setShowTranscript(v => !v)}
                        title="Conversation transcript"
                    >
                        <IconList/>
                    </button>

                    <div className="fi-ctrl-divider"/>

                    {/* End */}
                    {stage === 'live' && (
                        <button className="fi-ctrl-btn fi-ctrl-btn--end" onClick={handleEndSession} title="End interview">
                            <IconPhone/>
                        </button>
                    )}
                </div>

                {/* Right group — submit */}
                <div className="fi-ctrl-group">
                    {stage === 'live' && !feedback && (
                        <>
                            <button className="fi-skip-btn" onClick={handleSkip} disabled={isEvaluating}>
                                Skip →
                            </button>
                            <button className="fi-submit-btn" onClick={handleSubmit} disabled={isEvaluating}>
                                {isEvaluating
                                    ? <><span className="fi-eval-spinner"/>Evaluating...</>
                                    : <><IconCheck/>Submit Response</>
                                }
                            </button>
                        </>
                    )}
                </div>
            </footer>

            {/* ── Transcript Drawer ─────────────────────────────────────────── */}
            {showTranscript && (
                <div className="fi-transcript-drawer">
                    <div className="fi-transcript-drawer__header">
                        <span>Conversation</span>
                        <button onClick={() => setShowTranscript(false)}>✕</button>
                    </div>
                    <div className="fi-transcript-drawer__body">
                        {transcript_history.map((e, i) => (
                            <div key={i} className={`fi-tx-entry fi-tx-entry--${e.who}`}>
                                <span className="fi-tx-entry__who">{e.who === 'ai' ? 'AI' : 'You'}</span>
                                <span className="fi-tx-entry__text">
                                    {e.text}
                                    {e.score && <span className={`fi-tx-score fi-tx-score--${e.verdict}`}>{e.score}/10</span>}
                                </span>
                            </div>
                        ))}
                        {!transcript_history.length && <p className="fi-tx-empty">Conversation will appear here...</p>}
                    </div>
                </div>
            )}

            {/* ── SETUP OVERLAY ─────────────────────────────────────────────── */}
            {stage === 'setup' && (
                <div className="fi-setup">
                    <div className="fi-setup-card">
                        <div className="fi-setup-hero">
                            <div className="fi-setup-avatar">
                                <img src="/ai_avatar.png" alt="AI Interviewer"/>
                            </div>
                            <h1 className="fi-setup-title">Meet Alex, Your AI Interviewer</h1>
                            <p className="fi-setup-sub">
                                {report?.title ? <>Interviewing for <strong style={{color:'#8B5CF6'}}>{report.title}</strong>.<br/></> : null}
                                Alex analyzes your facial expressions, eye contact, and voice in real-time.
                            </p>
                        </div>

                        {/* Camera preview */}
                        <div className="fi-setup-preview" style={{ gridColumn: '1 / -1' }}>
                            <video ref={previewVideoRef} autoPlay muted playsInline/>
                            {!cameraReady && (
                                <div className="fi-setup-preview__overlay">
                                    {camPermission === 'denied'
                                        ? '⚠️ Camera access denied — allow in browser settings'
                                        : '📷 Click "Allow Permissions" to preview your camera'}
                                </div>
                            )}
                        </div>

                        {/* Features */}
                        <div className="fi-setup-check">
                            <div className="fi-setup-check__icon fi-setup-check__icon--green"><IconEye/></div>
                            <div>
                                <h4>Expression Detection</h4>
                                <p>AI tracks confidence, nervousness & focus in real-time</p>
                            </div>
                        </div>
                        <div className="fi-setup-check">
                            <div className="fi-setup-check__icon fi-setup-check__icon--blue"><IconMic/></div>
                            <div>
                                <h4>Voice Analysis</h4>
                                <p>Speaking rate, pause detection & voice stability measured</p>
                            </div>
                        </div>

                        {/* Permissions */}
                        <div className="fi-setup-perms" style={{ gridColumn: '1 / -1' }}>
                            <div className="fi-perm-pill">
                                <span className={camPermission}/>
                                Camera {camPermission === 'granted' ? '✓' : camPermission === 'denied' ? '✗' : '...'}
                            </div>
                            <div className="fi-perm-pill">
                                <span className={micPermission}/>
                                Microphone {micPermission === 'granted' ? '✓' : micPermission === 'denied' ? '✗' : '...'}
                            </div>
                            <div className="fi-perm-pill" style={{cursor:'pointer'}} onClick={() => setTtsEnabled(p => !p)}>
                                <span style={{background: ttsEnabled ? '#10B981' : '#6B7280'}}/>
                                AI Voice {ttsEnabled ? 'ON' : 'OFF'}
                            </div>
                        </div>

                        {/* Models loading */}
                        {!modelsLoaded && (
                            <div className="fi-setup-models-note" style={{ gridColumn: '1 / -1' }}>
                                {faceError ? <span style={{color:'#EF4444'}}>⚠️ {faceError}</span> : '⏳ Loading face detection models...'}
                            </div>
                        )}

                        {/* CTA */}
                        {camPermission !== 'granted' ? (
                            <button className="fi-setup-btn" onClick={handleRequestPermissions} disabled={!!faceError} style={{ gridColumn: '1 / -1' }}>
                                <IconVideo/> Allow Permissions & Preview
                            </button>
                        ) : (
                            <button className="fi-setup-btn" onClick={handleStartSession} disabled={!modelsLoaded || !cameraReady || !allQuestions.length} style={{ gridColumn: '1 / -1' }}>
                                {!modelsLoaded ? '⏳ Loading models...' : <><IconZap/> Start Interview Session</>}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── COMPLETE OVERLAY ──────────────────────────────────────────── */}
            {stage === 'complete' && (
                <div className="fi-complete">
                    <div className="fi-complete-card">
                        <div className="fi-complete-icon"><IconCheck/></div>
                        <h2 className="fi-complete-title">Interview Complete</h2>
                        <p className="fi-complete-sub">Your behavioral session has been analyzed.</p>

                        <div className="fi-complete-score">
                            <div className="fi-complete-score__big">{completionStats.overall}<small>/10</small></div>
                            <div className="fi-complete-score__label">Overall Score</div>
                        </div>

                        <div className="fi-complete-breakdown">
                            {[
                                { label: 'Content Quality', key: 'content' },
                                { label: 'Confidence',      key: 'confidence' },
                                { label: 'Communication',   key: 'communication' },
                                { label: 'Eye Contact',     key: 'eyeContact' },
                            ].map(({ label, key }) => (
                                <div key={key} className="fi-complete-stat">
                                    <div className="fi-complete-stat__label">{label}</div>
                                    <div className="fi-complete-stat__bar">
                                        <div className="fi-complete-stat__fill" style={{ width: `${completionStats[key] * 10}%` }}/>
                                    </div>
                                    <div className="fi-complete-stat__val" style={{ color: completionStats[key] >= 7 ? '#10B981' : completionStats[key] >= 5 ? '#F59E0B' : '#EF4444' }}>
                                        {completionStats[key]}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="fi-complete-pills">
                            <div className="fi-stat-pill">
                                <div className="fi-stat-pill__val">{formatTime(sessionSec)}</div>
                                <div className="fi-stat-pill__label">Total Time</div>
                            </div>
                            <div className="fi-stat-pill">
                                <div className="fi-stat-pill__val">{sessionResults.filter(r => !r.skipped).length}</div>
                                <div className="fi-stat-pill__label">Answered</div>
                            </div>
                            <div className="fi-stat-pill">
                                <div className="fi-stat-pill__val">{sessionResults.filter(r => !r.skipped && r.verdict === 'excellent').length}</div>
                                <div className="fi-stat-pill__label">Excellent</div>
                            </div>
                        </div>

                        <div className="fi-complete-actions">
                            <button className="fi-btn-primary" onClick={() => navigate(`/interview/${interviewId}`)}>
                                <IconHome/> Back to Dashboard
                            </button>
                            <button className="fi-btn-ghost" onClick={() => { setStage('setup'); setQIndex(0); setSessionResults([]); setTranscriptHistory([]); setFeedback(null); setSessionSec(0); setAnswer('') }}>
                                Retry
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default FaceInterview
