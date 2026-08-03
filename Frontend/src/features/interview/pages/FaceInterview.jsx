import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { useInterview } from '../hooks/useInterview'
import { useFaceAnalysis } from '../hooks/useFaceAnalysis'
import { useVoiceAnalysis } from '../hooks/useVoiceAnalysis'
import '../style/faceinterview.scss'

// ── Icons ──────────────────────────────────────────────────────────────────────
const IconVideo     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
const IconMic       = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
const IconStar      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
const IconCheck     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
const IconArrow     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
const IconStop      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
const IconBrain     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>
const IconEye       = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
const IconZap       = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
const IconHome      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>

// ── Expression labels & emojis ─────────────────────────────────────────────────
const EXPR_MAP = {
    neutral:   { emoji: '🎯', label: 'Focused',    cls: 'neutral' },
    happy:     { emoji: '😊', label: 'Confident',  cls: 'happy' },
    fearful:   { emoji: '😰', label: 'Nervous',    cls: 'fearful' },
    sad:       { emoji: '😔', label: 'Hesitant',   cls: 'sad' },
    surprised: { emoji: '😲', label: 'Surprised',  cls: 'surprised' },
    disgusted: { emoji: '😤', label: 'Frustrated', cls: 'disgusted' },
    angry:     { emoji: '😠', label: 'Tense',      cls: 'angry' },
}

// ── Nervousness level helper ──────────────────────────────────────────────────
function nervousnessLevel(score) {
    if (score < 30) return 'calm'
    if (score < 60) return 'mild'
    return 'nervous'
}

function nervousnessColor(score) {
    if (score < 30) return '#10B981'
    if (score < 60) return '#F59E0B'
    return '#EF4444'
}

// ── Timer display ─────────────────────────────────────────────────────────────
function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0')
    const s = (sec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
}

// ── Score color class ─────────────────────────────────────────────────────────
function scoreColorClass(score) {
    if (score >= 8) return 'high'
    if (score >= 6) return 'mid'
    return 'low'
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const FaceInterview = () => {
    const { interviewId } = useParams()
    const navigate        = useNavigate()
    const { report, getReportById, evaluateFaceInterview } = useInterview()

    // ── Stages: 'setup' | 'live' | 'complete' ────────────────────────────────
    const [stage,        setStage]        = useState('setup')
    const [sessionSec,   setSessionSec]   = useState(0)
    const [answerSec,    setAnswerSec]    = useState(120)  // 2-min countdown per question
    const [qIndex,       setQIndex]       = useState(0)
    const [answer,       setAnswer]       = useState('')
    const [isEvaluating, setIsEvaluating] = useState(false)
    const [isSpeaking,   setIsSpeaking]   = useState(false)   // TTS speaking state
    const [aiStatus,     setAiStatus]     = useState('idle')  // idle|speaking|listening|thinking
    const [feedback,     setFeedback]     = useState(null)
    const [transcript_history, setTranscriptHistory] = useState([])  // [{who, text, score?}]
    const [sessionResults, setSessionResults] = useState([])         // per-question eval
    const [camPermission, setCamPermission] = useState('pending')    // pending|granted|denied
    const [micPermission, setMicPermission] = useState('pending')
    const [ttsEnabled,    setTtsEnabled]   = useState(true)

    const answerTimerRef = useRef(null)

    const timerRef = useRef(null)
    const synthRef = useRef(window.speechSynthesis)

    // ── Face + voice hooks ────────────────────────────────────────────────────
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
    useEffect(() => {
        if (interviewId) getReportById(interviewId)
    }, [interviewId])

    // Sync voice transcript to answer textarea
    useEffect(() => {
        if (transcript && isListening) setAnswer(transcript)
    }, [transcript, isListening])

    // ── Flatten questions: all technical then behavioral ──────────────────────
    const allQuestions = report
        ? [
            ...(report.technicalQuestions  || []).map(q => ({ ...q, type: 'technical' })),
            ...(report.behavioralQuestions || []).map(q => ({ ...q, type: 'behavioral' })),
          ]
        : []

    const currentQ = allQuestions[qIndex]

    // ── Session timer ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (stage === 'live') {
            timerRef.current = setInterval(() => setSessionSec(s => s + 1), 1000)
        } else {
            clearInterval(timerRef.current)
        }
        return () => clearInterval(timerRef.current)
    }, [stage])

    // ── Per-question answer countdown (2 min, auto-submit on 0) ───────────────
    useEffect(() => {
        clearInterval(answerTimerRef.current)
        if (stage !== 'live' || feedback || isEvaluating) return
        // Reset to 120s for each new question
        setAnswerSec(120)
        answerTimerRef.current = setInterval(() => {
            setAnswerSec(prev => {
                if (prev <= 1) {
                    clearInterval(answerTimerRef.current)
                    // Auto-submit when time runs out
                    handleSubmitRef.current()
                    return 0
                }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(answerTimerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stage, qIndex, feedback, isEvaluating])

    const handleSubmitRef = useRef(null)

    // ── Request permissions & start camera on setup screen ───────────────────
    const handleRequestPermissions = useCallback(async () => {
        try {
            await startCamera()
            setCamPermission('granted')
            setMicPermission('granted')
        } catch {
            setCamPermission('denied')
            setMicPermission('denied')
        }
    }, [startCamera])

    // ── TTS: AI speaks the question ───────────────────────────────────────────
    const speakQuestion = useCallback((text) => {
        synthRef.current?.cancel()
        setIsSpeaking(false)
        setAiStatus('idle')
        if (!ttsEnabled || !synthRef.current) return
        const utt = new SpeechSynthesisUtterance(text)
        utt.rate  = 0.88
        utt.pitch = 1.05
        utt.volume = 1
        // Try to pick a natural voice
        const voices = synthRef.current.getVoices()
        const preferred = voices.find(v =>
            v.name.includes('Google UK English Male') ||
            v.name.includes('Daniel') ||
            v.name.includes('Alex') ||
            v.lang === 'en-US'
        )
        if (preferred) utt.voice = preferred
        utt.onstart  = () => { setIsSpeaking(true);  setAiStatus('speaking') }
        utt.onend    = () => { setIsSpeaking(false); setAiStatus('listening') }
        utt.onerror  = () => { setIsSpeaking(false); setAiStatus('listening') }
        synthRef.current.speak(utt)
    }, [ttsEnabled])

    // ── Start live session ────────────────────────────────────────────────────
    const handleStartSession = useCallback(() => {
        setStage('live')

        // Step 1: attach stream to main video (React needs to render the new stage first)
        setTimeout(() => {
            attachStreamToMainVideo()
        }, 150)

        // Step 2: start detection after video has a frame
        setTimeout(() => {
            startDetection()
        }, 600)

        // Step 3: voice analysis (separate mic stream, doesn't need camera)
        setTimeout(() => {
            startVoiceAnalysis()
        }, 300)

        if (allQuestions.length > 0) {
            const q = allQuestions[0]
            const intro = `Question 1. ${q.type === 'technical' ? 'Technical question.' : 'Behavioral question.'} ${q.question}`
            setTimeout(() => speakQuestion(intro), 900)
            setTranscriptHistory([{ who: 'ai', text: q.question }])
        }
    }, [allQuestions, attachStreamToMainVideo, startDetection, startVoiceAnalysis, speakQuestion])


    // ── Submit answer ─────────────────────────────────────────────────────────
    const handleSubmit = useCallback(async () => {
        if (!currentQ || isEvaluating) return
        clearInterval(answerTimerRef.current)   // stop countdown
        stopVoiceAnalysis()

        const expressionMetrics = getExpressionMetrics()
        const voiceMetrics      = getVoiceMetrics()
        const answerText        = answer.trim() || transcript.trim()

        setTranscriptHistory(prev => [...prev, { who: 'user', text: answerText || '(no answer provided — evaluated on behavior)' }])
        setIsEvaluating(true)
        setAiStatus('thinking')
        setFeedback(null)

        try {
            const result = await evaluateFaceInterview({
                question:          currentQ.question,
                transcript:        answerText,
                expressionMetrics,
                voiceMetrics,
                interviewId,
                questionType:      currentQ.type,
            })

            setFeedback(result)
            setAiStatus('speaking')
            setSessionResults(prev => [...prev, { question: currentQ.question, type: currentQ.type, ...result }])

            // Add AI response to transcript
            setTranscriptHistory(prev => [...prev, {
                who: 'ai',
                text: result.contentFeedback,
                score: result.overallScore,
                verdict: result.verdict,
            }])

            // Speak feedback summary
            speakQuestion(`Good effort. Overall score ${result.overallScore} out of 10. ${result.behaviorFeedback}`)

        } catch (err) {
            console.error('Face eval error:', err)
            setTranscriptHistory(prev => [...prev, { who: 'ai', text: 'Evaluation failed. Please try again.' }])
        } finally {
            setIsEvaluating(false)
        }
    }, [currentQ, isEvaluating, answer, transcript, getExpressionMetrics, getVoiceMetrics, evaluateFaceInterview, interviewId, speakQuestion])

    // ── Next question ─────────────────────────────────────────────────────────
    const handleNext = useCallback(() => {
        if (qIndex + 1 >= allQuestions.length) {
            // Session complete
            synthRef.current?.cancel()
            stopDetection()
            stopCamera()
            stopVoiceAnalysis()
            setStage('complete')
            return
        }

        const next = allQuestions[qIndex + 1]
        setQIndex(qi => qi + 1)
        setAnswer('')
        setFeedback(null)
        resetSamples()
        resetTranscript()
        startVoiceAnalysis()

        const intro = `Question ${qIndex + 2}. ${next.type === 'technical' ? 'Technical.' : 'Behavioral.'} ${next.question}`
        setTimeout(() => speakQuestion(intro), 400)
        setTranscriptHistory(prev => [...prev, { who: 'ai', text: next.question }])
    }, [qIndex, allQuestions, stopDetection, stopCamera, stopVoiceAnalysis, resetSamples, resetTranscript, startVoiceAnalysis, speakQuestion])

    // ── End session early ─────────────────────────────────────────────────────
    const handleEndSession = useCallback(() => {
        synthRef.current?.cancel()
        stopDetection()
        stopCamera()
        stopVoiceAnalysis()
        setStage('complete')
    }, [stopDetection, stopCamera, stopVoiceAnalysis])

    const handleEndSessionRef = useRef(handleEndSession)
    useEffect(() => { handleEndSessionRef.current = handleEndSession }, [handleEndSession])

    // ── Skip question ─────────────────────────────────────────────────────────
    const handleSkip = useCallback(() => {
        if (qIndex + 1 >= allQuestions.length) {
            handleEndSessionRef.current()
            return
        }
        setSessionResults(prev => [...prev, { question: currentQ?.question, type: currentQ?.type, overallScore: 0, verdict: 'needs_work', skipped: true }])
        handleNext()
    }, [qIndex, allQuestions, currentQ, handleNext])

    // ── Computed averages for completion screen ───────────────────────────────
    const completionStats = (() => {
        const answered = sessionResults.filter(r => !r.skipped)
        if (answered.length === 0) return { overall: 0, content: 0, confidence: 0, communication: 0, eyeContact: 0 }
        const avg = key => Math.round(answered.reduce((acc, r) => acc + (r[key] || 0), 0) / answered.length)
        return {
            overall:       avg('overallScore'),
            content:       avg('contentScore'),
            confidence:    avg('confidenceScore'),
            communication: avg('communicationScore'),
            eyeContact:    avg('eyeContactScore'),
        }
    })()

    // ── Loading state ─────────────────────────────────────────────────────────
    if (!report) {
        return (
            <div className="face-page">
                <div className="face-loading">
                    <div className="spinner" />
                    <p>Loading interview questions...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="face-page">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <header className="face-header">
                <div className="face-header__left">
                    <Link to={`/interview/${interviewId}`} className="face-header__logo">
                        <IconBrain />
                        <span>PrepIQ</span>
                    </Link>
                    {stage === 'live' && (
                        <div className="face-header__live-badge">
                            <span className="live-dot" />
                            LIVE
                        </div>
                    )}
                </div>

                <div className="face-header__center">
                    <span className="face-header__session-label">Session Time</span>
                    <span className="face-header__timer">{formatTime(sessionSec)}</span>
                </div>

                <div className="face-header__right">
                    {stage === 'live' && (
                        <>
                            <span className="face-header__q-count">
                                {qIndex + 1} / {allQuestions.length}
                            </span>
                            <button className="face-header__end-btn" onClick={handleEndSession}>
                                <IconStop /> End Session
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* ── 3-Panel Body ───────────────────────────────────────────── */}
            <div className="face-body">

                {/* LEFT — AI Interviewer (Video Call Style) */}
                <div className="face-ai-panel">
                    {/* ── Video Conference Window ───────────────────────────── */}
                    <div className={`video-call-frame ${isSpeaking ? 'video-call-frame--speaking' : ''} ${isEvaluating ? 'video-call-frame--thinking' : ''}`}>
                        {/* Top status bar */}
                        <div className="video-call-frame__topbar">
                            <div className="vc-left">
                                <div className={`vc-live-dot ${stage === 'live' ? 'vc-live-dot--active' : ''}`} />
                                <span className="vc-live-text">{stage === 'live' ? 'LIVE' : 'STANDBY'}</span>
                            </div>
                            <div className="vc-right">
                                <span className="vc-badge">HD</span>
                                <span className="vc-badge vc-badge--ai">AI</span>
                            </div>
                        </div>

                        {/* Avatar viewport — simulates video feed */}
                        <div className="video-call-frame__viewport">
                            <img src="/ai_avatar.png" alt="Alex — AI Interviewer" className="vc-avatar-img" />
                            
                            {/* Ambient glow behind avatar */}
                            <div className="vc-ambient-glow" />

                            {/* Speaking: audio equalizer overlay */}
                            <div className={`vc-equalizer ${isSpeaking ? 'vc-equalizer--active' : ''}`}>
                                {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
                                    <span key={i} style={{ animationDelay: `${i * 0.06}s` }} />
                                ))}
                            </div>

                            {/* Thinking: pulsing overlay */}
                            {isEvaluating && (
                                <div className="vc-thinking-overlay">
                                    <div className="vc-thinking-spinner" />
                                    <span>Analyzing...</span>
                                </div>
                            )}
                        </div>

                        {/* Bottom name plate */}
                        <div className="video-call-frame__nameplate">
                            <div className="vc-nameplate-left">
                                <h3>Alex</h3>
                                <p>{report?.title || 'Technical'} Interviewer</p>
                            </div>
                            <div className={`vc-status-chip vc-status-chip--${aiStatus}`}>
                                {aiStatus === 'speaking'  && '🔊 Speaking'}
                                {aiStatus === 'listening' && '👂 Listening'}
                                {aiStatus === 'thinking'  && '🤔 Thinking'}
                                {aiStatus === 'idle'      && '● Ready'}
                            </div>
                        </div>

                        {/* Connection quality dots */}
                        <div className="vc-connection">
                            <span className="vc-conn-dot" />
                            <span className="vc-conn-dot" />
                            <span className="vc-conn-dot" />
                        </div>
                    </div>

                    {/* Current Question — overlaid like video call caption */}
                    {currentQ && stage === 'live' && (
                        <div className="face-ai-panel__question-card">
                            <div className="q-meta">
                                <span className={`q-type-badge q-type-badge--${currentQ.type}`}>
                                    {currentQ.type}
                                </span>
                                <span className="q-counter">Q{qIndex + 1} / {allQuestions.length}</span>
                            </div>
                            <p className="q-text">{currentQ.question}</p>
                            <div className="q-progress-bar">
                                <div
                                    className="q-progress-bar-fill"
                                    style={{ width: `${((qIndex + 1) / allQuestions.length) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Conversation Transcript */}
                    <div className="face-ai-panel__transcript">
                        <div className="face-ai-panel__transcript-label">Conversation</div>
                        {transcript_history.map((entry, i) => (
                            <div key={i} className="transcript-entry" style={{ animationDelay: `${i * 0.05}s` }}>
                                <span className={`transcript-entry__who transcript-entry__who--${entry.who}`}>
                                    {entry.who === 'ai' ? 'AI' : 'You'}
                                </span>
                                <span className="transcript-entry__text">
                                    {entry.text}
                                    {entry.score && (
                                        <span className={`transcript-entry__score transcript-entry__score--${entry.verdict}`}>
                                            {entry.score}/10
                                        </span>
                                    )}
                                </span>
                            </div>
                        ))}
                        {isEvaluating && (
                            <div className="transcript-entry">
                                <span className="transcript-entry__who transcript-entry__who--ai">AI</span>
                                <span className="transcript-entry__text" style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                                    Analyzing your response...
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* CENTER — Webcam Feed */}
                <div className="face-cam-panel">
                    <div className={`face-cam-panel__viewport face-cam-panel__viewport--${nervousnessLevel(nervousnessScore)} ${!faceDetected && stage === 'live' ? 'face-cam-panel__viewport--no-face' : ''}`}>
                        <video ref={videoRef} autoPlay muted playsInline />
                        <canvas ref={canvasRef} />

                        {/* Expression badge */}
                        {faceDetected && stage === 'live' && (
                            <div className={`face-cam-panel__expr-badge face-cam-panel__expr-badge--${currentExpression}`}>
                                {EXPR_MAP[currentExpression]?.emoji || '🎯'} {EXPR_MAP[currentExpression]?.label || 'Neutral'}
                            </div>
                        )}
                    </div>

                    {/* Voice level bar */}
                    <div className="face-cam-panel__voice-bar">
                        <div className="vbar-label">
                            <span>🎤 Voice Level</span>
                            <span style={{ color: voiceLevel > 20 ? '#10B981' : 'rgba(255,255,255,0.25)' }}>
                                {isListening ? (voiceLevel > 5 ? 'Speaking' : 'Listening...') : 'Mic off'}
                            </span>
                        </div>
                        <div className="vbar-track">
                            <div className="vbar-fill" style={{ width: `${voiceLevel}%` }} />
                        </div>
                    </div>

                    {/* Live transcript */}
                    <div className="face-cam-panel__live-text">
                        <span className="live-prefix">🔴 Live Transcript</span>
                        {transcript || <span style={{ color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>Start speaking to see your answer here...</span>}
                        {isListening && <span className="live-cursor" />}
                    </div>
                </div>

                {/* RIGHT — Metrics + Controls */}
                <div className="face-right-panel">

                    {/* Live Metrics */}
                    <div>
                        <div className="face-right-panel__section-label">Live Analysis</div>
                        <div className="metrics-grid">

                            <div className={`metric-bar metric-bar--nervousness`}>
                                <div className="metric-bar__header">
                                    <span className="metric-bar__name">
                                        <IconZap style={{ width: 13, height: 13 }} />
                                        Nervousness
                                    </span>
                                    <span className={`metric-bar__value metric-bar__value--${nervousnessScore < 30 ? 'good' : nervousnessScore < 60 ? 'warning' : 'danger'}`}>
                                        {Math.round(nervousnessScore)}%
                                    </span>
                                </div>
                                <div className="metric-bar__track">
                                    <div className="metric-fill" style={{ width: `${nervousnessScore}%` }} />
                                </div>
                            </div>

                            <div className="metric-bar metric-bar--eye-contact">
                                <div className="metric-bar__header">
                                    <span className="metric-bar__name">
                                        <IconEye style={{ width: 13, height: 13 }} />
                                        Eye Contact
                                    </span>
                                    <span className={`metric-bar__value metric-bar__value--${eyeContactPct >= 70 ? 'good' : eyeContactPct >= 45 ? 'warning' : 'danger'}`}>
                                        {eyeContactPct}%
                                    </span>
                                </div>
                                <div className="metric-bar__track">
                                    <div className="metric-fill" style={{ width: `${eyeContactPct}%` }} />
                                </div>
                            </div>

                            <div className="metric-bar metric-bar--confidence">
                                <div className="metric-bar__header">
                                    <span className="metric-bar__name">
                                        <IconStar style={{ width: 13, height: 13 }} />
                                        Confidence
                                    </span>
                                    <span className={`metric-bar__value metric-bar__value--${(100 - nervousnessScore) >= 65 ? 'good' : (100 - nervousnessScore) >= 40 ? 'warning' : 'danger'}`}>
                                        {Math.round(100 - nervousnessScore)}%
                                    </span>
                                </div>
                                <div className="metric-bar__track">
                                    <div className="metric-fill" style={{ width: `${100 - nervousnessScore}%` }} />
                                </div>
                            </div>

                            <div className="metric-bar metric-bar--voice">
                                <div className="metric-bar__header">
                                    <span className="metric-bar__name">
                                        <IconMic style={{ width: 13, height: 13 }} />
                                        Voice Activity
                                    </span>
                                    <span className={`metric-bar__value metric-bar__value--${voiceLevel > 10 ? 'good' : 'warning'}`}>
                                        {voiceLevel > 10 ? 'Active' : 'Quiet'}
                                    </span>
                                </div>
                                <div className="metric-bar__track">
                                    <div className="metric-fill" style={{ width: `${voiceLevel}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Answer area (shown when no feedback yet) */}
                    {!feedback && stage === 'live' && (
                        <div className="answer-section">
                            <div className="face-right-panel__section-label" style={{ marginBottom: '0.5rem' }}>Your Answer</div>
                            <textarea
                                placeholder="Your spoken answer appears here automatically. You can also type or edit it..."
                                value={answer}
                                onChange={e => setAnswer(e.target.value)}
                                disabled={isEvaluating}
                            />
                            <div className="answer-footer">
                                <span className="word-count">{answer.trim() ? answer.trim().split(/\s+/).filter(Boolean).length : 0} words</span>
                            </div>
                        </div>
                    )}

                    {/* ── Answer Timer + Controls ── */}
                    {stage === 'live' && !feedback && (
                        <div className="face-answer-timer" style={{
                            background: answerSec <= 30 ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${answerSec <= 30 ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: 14,
                            padding: '0.75rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexShrink: 0,
                            gap: '0.75rem',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={answerSec <= 30 ? '#EF4444' : 'rgba(255,255,255,0.35)'} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: answerSec <= 30 ? '#EF4444' : 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    {answerSec <= 30 ? '⚠ Time running out!' : 'Answer time'}
                                </span>
                            </div>
                            <span style={{
                                fontSize: '1.4rem',
                                fontWeight: 900,
                                fontVariantNumeric: 'tabular-nums',
                                color: answerSec <= 30 ? '#EF4444' : answerSec <= 60 ? '#F59E0B' : '#10B981',
                                letterSpacing: '0.04em',
                                animation: answerSec <= 10 ? 'pulseDot 0.6s ease infinite' : 'none',
                            }}>
                                {formatTime(answerSec)}
                            </span>
                        </div>
                    )}

                    {/* Submit + Skip */}
                    {!feedback && stage === 'live' && (
                        <>
                            {/* Hint when no answer yet */}
                            {!answer.trim() && !transcript.trim() && !isEvaluating && (
                                <div style={{
                                    background: 'rgba(99,102,241,0.08)',
                                    border: '1px solid rgba(99,102,241,0.2)',
                                    borderRadius: 10,
                                    padding: '0.65rem 0.85rem',
                                    fontSize: '0.76rem',
                                    color: 'rgba(255,255,255,0.45)',
                                    lineHeight: 1.5,
                                    flexShrink: 0
                                }}>
                                    🎤 <strong style={{color:'rgba(255,255,255,0.7)'}}>Speak your answer</strong> — mic is active. Or type below. Submit anytime.
                                </div>
                            )}
                            <button
                                className="face-submit-btn"
                                onClick={handleSubmit}
                                disabled={isEvaluating}
                            >
                                {isEvaluating
                                    ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> AI Evaluating...</>
                                    : <><IconCheck /> Submit Answer</>
                                }
                            </button>
                            <button
                                className="face-skip-btn"
                                onClick={handleSkip}
                                disabled={isEvaluating}
                            >
                                Skip Question →
                            </button>
                        </>
                    )}

                    {/* AI Feedback Card */}
                    {feedback && (
                        <div className="face-feedback">
                            <div className="face-feedback__header">
                                <h4>AI Evaluation</h4>
                                <div className="score-chip">
                                    <span className={`score-big score-big--${feedback.verdict}`}>
                                        {feedback.overallScore}
                                    </span>
                                    <span className="score-denom">/10</span>
                                </div>
                            </div>

                            <div className="face-feedback__body">
                                {/* Score breakdown */}
                                <div className="score-breakdown">
                                    {[
                                        { label: 'Content',    val: feedback.contentScore },
                                        { label: 'Confidence', val: feedback.confidenceScore },
                                        { label: 'Comm.',      val: feedback.communicationScore },
                                        { label: 'Eye Contact',val: feedback.eyeContactScore },
                                    ].map(({ label, val }) => (
                                        <div key={label} className="score-item">
                                            <div className="score-item__label">{label}</div>
                                            <div className={`score-item__value score-item__value--${scoreColorClass(val)}`}>{val}<span style={{ fontSize: '0.65rem', opacity: 0.5 }}>/10</span></div>
                                        </div>
                                    ))}
                                </div>

                                {/* Behavior insights */}
                                <div className="behavior-insights">
                                    {feedback.behaviorInsights?.map((b, i) => (
                                        <div key={i} className={`insight-item insight-item--${b.type}`}>
                                            {b.insight}
                                        </div>
                                    ))}
                                </div>

                                {/* Content feedback */}
                                <div className="feedback-text-block">
                                    <div className="feedback-text-block__label">Content Feedback</div>
                                    {feedback.contentFeedback}
                                </div>

                                {/* Improvements */}
                                {feedback.improvements?.length > 0 && (
                                    <div>
                                        <div className="face-right-panel__section-label" style={{ marginBottom: '0.4rem' }}>Improvements</div>
                                        {feedback.improvements.map((imp, i) => (
                                            <div key={i} style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.45)', paddingLeft: '0.75rem', borderLeft: '2px solid rgba(99,102,241,0.4)', marginBottom: '0.3rem', lineHeight: '1.4' }}>
                                                {imp}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button className="face-feedback__next-btn" onClick={handleNext}>
                                {qIndex + 1 >= allQuestions.length ? (
                                    <><IconCheck /> Finish Session</>
                                ) : (
                                    <>Next Question <IconArrow /></>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Setup Screen ───────────────────────────────────────────── */}
            {stage === 'setup' && (
                <div className="face-setup">
                    <div className="face-setup__card">
                        <div className="face-setup__hero">
                            {/* Avatar preview in setup */}
                            <div className="setup-avatar-preview">
                                <img src="/ai_avatar.png" alt="AI Interviewer" />
                                <div className="setup-avatar-preview__glow" />
                            </div>
                            <h1 className="face-setup__title">Meet Alex, Your AI Interviewer</h1>
                            <p className="face-setup__subtitle">
                                {report?.title
                                    ? <>Interviewing for <strong style={{color:'#8B5CF6'}}>{report.title}</strong> role.<br/></>
                                    : null}
                                Alex will ask you JD-specific questions, analyze your facial expressions, eye contact, and voice in real-time.
                            </p>
                        </div>

                        {/* Camera preview — uses previewVideoRef to avoid ref conflict with main body */}
                        <div className="face-setup__preview" style={{ gridColumn: '1 / -1' }}>
                            <video ref={previewVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {!cameraReady && (
                                <div className="face-setup__preview-overlay">
                                    {camPermission === 'denied'
                                        ? '⚠️ Camera access denied — please allow in browser settings'
                                        : '📷 Click "Allow Permissions" to preview your camera'}
                                </div>
                            )}
                        </div>

                        {/* Checklist */}
                        <div className="face-setup__check">
                            <div className="face-setup__check-icon face-setup__check-icon--green">
                                <IconEye style={{ width: 16, height: 16 }} />
                            </div>
                            <div className="face-setup__check-text">
                                <h4>Expression Detection</h4>
                                <p>AI tracks confidence, nervousness & focus in real-time</p>
                            </div>
                        </div>

                        <div className="face-setup__check">
                            <div className="face-setup__check-icon face-setup__check-icon--blue">
                                <IconMic style={{ width: 16, height: 16 }} />
                            </div>
                            <div className="face-setup__check-text">
                                <h4>Voice Analysis</h4>
                                <p>Speaking rate, pause detection & voice stability measured</p>
                            </div>
                        </div>

                        {/* Permissions status */}
                        <div className="face-setup__permissions">
                            <div className="perm-pill">
                                <div className={`perm-dot perm-dot--${camPermission}`} />
                                Camera {camPermission === 'granted' ? '✓' : camPermission === 'denied' ? '✗' : ''}
                            </div>
                            <div className="perm-pill">
                                <div className={`perm-dot perm-dot--${micPermission}`} />
                                Microphone {micPermission === 'granted' ? '✓' : micPermission === 'denied' ? '✗' : ''}
                            </div>
                            <div className="perm-pill" style={{ cursor: 'pointer' }} onClick={() => setTtsEnabled(p => !p)}>
                                <div className="perm-dot" style={{ background: ttsEnabled ? '#10B981' : '#6B7280' }} />
                                AI Voice {ttsEnabled ? 'ON' : 'OFF'}
                            </div>
                        </div>

                        {/* Models loading state */}
                        {!modelsLoaded && (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', padding: '0.5rem' }}>
                                {faceError
                                    ? <span style={{ color: '#EF4444' }}>⚠️ {faceError}</span>
                                    : '⏳ Loading face detection models...'}
                            </div>
                        )}

                        {/* Action buttons */}
                        {camPermission !== 'granted' ? (
                            <button
                                className="face-setup__start-btn"
                                onClick={handleRequestPermissions}
                                disabled={!!faceError}
                            >
                                <IconVideo style={{ width: 18, height: 18 }} />
                                Allow Permissions & Preview
                            </button>
                        ) : (
                            <button
                                className="face-setup__start-btn"
                                onClick={handleStartSession}
                                disabled={!modelsLoaded || !cameraReady || allQuestions.length === 0}
                            >
                                {!modelsLoaded ? '⏳ Loading models...' : (
                                    <><IconZap style={{ width: 18, height: 18 }} /> Start Interview Session</>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── Complete Screen ─────────────────────────────────────────── */}
            {stage === 'complete' && (
                <div className="face-complete">
                    <div className="face-complete__card">
                        <div className="face-complete__header">
                            <div className="complete-icon">
                                <IconCheck style={{ width: 32, height: 32 }} />
                            </div>
                            <h2>Interview Complete!</h2>
                            <p>Your behavioral interview session has been analyzed.</p>
                        </div>

                        {/* Overall score */}
                        <div className="face-complete__overall-score">
                            <div className="big-score">
                                <div className={`big-score__num big-score__num--${completionStats.overall >= 8 ? 'excellent' : completionStats.overall >= 6 ? 'good' : completionStats.overall >= 4 ? 'average' : 'needs_work'}`}>
                                    {completionStats.overall}
                                </div>
                                <div className="big-score__label">Overall Score</div>
                            </div>

                            <div className="divider" />

                            <div className="score-breakdown-mini">
                                {[
                                    { label: 'Content Quality', key: 'content', cls: 'content' },
                                    { label: 'Confidence',      key: 'confidence', cls: 'confidence' },
                                    { label: 'Communication',   key: 'communication', cls: 'comm' },
                                    { label: 'Eye Contact',     key: 'eyeContact', cls: 'eye' },
                                ].map(({ label, key, cls }) => (
                                    <div key={key} className={`mini-score mini-score--${cls}`}>
                                        <span className="mini-score__label">{label}</span>
                                        <div className="mini-score__bar">
                                            <div className="mini-fill" style={{ width: `${completionStats[key] * 10}%` }} />
                                        </div>
                                        <span className={`mini-score__val`} style={{ color: completionStats[key] >= 7 ? '#10B981' : completionStats[key] >= 5 ? '#F59E0B' : '#EF4444' }}>
                                            {completionStats[key]}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Session stats */}
                        <div className="face-complete__stats">
                            <div className="stat-pill">
                                <div className="stat-pill__value">{formatTime(sessionSec)}</div>
                                <div className="stat-pill__label">Total Time</div>
                            </div>
                            <div className="stat-pill">
                                <div className="stat-pill__value">{sessionResults.filter(r => !r.skipped).length}</div>
                                <div className="stat-pill__label">Questions Answered</div>
                            </div>
                            <div className="stat-pill">
                                <div className="stat-pill__value">
                                    {sessionResults.length > 0
                                        ? sessionResults.filter(r => !r.skipped && r.verdict === 'excellent').length
                                        : 0}
                                </div>
                                <div className="stat-pill__label">Excellent Answers</div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="face-complete__actions">
                            <button className="btn-primary" onClick={() => navigate(`/interview/${interviewId}`)}>
                                <IconHome style={{ width: 16, height: 16 }} /> Back to Dashboard
                            </button>
                            <button className="btn-ghost" onClick={() => { setStage('setup'); setQIndex(0); setSessionResults([]); setTranscriptHistory([]); setFeedback(null); setSessionSec(0); setAnswer(''); }}>
                                Retry Interview
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default FaceInterview
