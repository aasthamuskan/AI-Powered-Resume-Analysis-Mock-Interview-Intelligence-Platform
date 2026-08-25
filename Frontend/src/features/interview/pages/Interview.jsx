import React, { useState, useEffect, useRef, useCallback } from 'react'
import '../style/interview.scss'
import '../style/mockinterview.scss'
import { useInterview } from '../hooks/useInterview.js'
import { useAuth } from '../../auth/hooks/useAuth'
import { useNavigate, useParams } from 'react-router'

// ── Icons ──────────────────────────────────────────────────────────────────────
const IconDashboard = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
)
const IconCode = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
)
const IconChat = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
)
const IconGaps = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
)
const IconMap = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
)
const IconSettings = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
)
const IconHelp = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
)
const IconLogout = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
)
const IconDownload = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
)
const IconVideo = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
)
const IconStar = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
)
const IconZap = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
)
const IconBook = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
)

// ── Nav Items ──────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
    { id: 'overview', label: 'Dashboard', icon: <IconDashboard /> },
    { id: 'technical', label: 'Deep Work', icon: <IconCode /> },
    { id: 'behavioral', label: 'AI Insights', icon: <IconChat /> },
    { id: 'gaps', label: 'Library', icon: <IconBook /> },
    { id: 'roadmap', label: 'Roadmap', icon: <IconMap /> },
    { id: 'mock', label: 'Mock Interview', icon: <IconStar /> },
    { id: 'face', label: 'Face Interview', icon: <IconVideo /> },
]

const SUGGESTIONS = [
    'Add 3 more technical questions',
    'Change Day 3 to System Design',
    'Add Docker to skill gaps',
    'Explain how to answer Q1',
]

// ── Score ring helper ──────────────────────────────────────────────────────────
const ScoreRing = ({ score }) => {
    const R = 27
    const circ = 2 * Math.PI * R
    const offset = circ - (score / 100) * circ
    const cls = score >= 80 ? 'ring--high' : score >= 60 ? 'ring--mid' : 'ring--low'

    return (
        <div className="stat-card__ring">
            <svg viewBox="0 0 64 64">
                <circle className="ring-bg" cx="32" cy="32" r={R} />
                <circle
                    className={`ring-fill ${cls}`}
                    cx="32" cy="32" r={R}
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                />
            </svg>
            <span className="ring-num">{score}</span>
        </div>
    )
}

// ── Question Card ──────────────────────────────────────────────────────────────
const QuestionCard = ({ item, index, type }) => {
    const [open, setOpen] = useState(false)
    return (
        <div className="q-card">
            <div className="q-card__header" onClick={() => setOpen(o => !o)}>
                <span className={`q-card__type q-card__type--${type}`}>{type}</span>
                <span className="q-card__index">Q{index + 1}</span>
                <p className="q-card__question">{item.question}</p>
                <span className={`q-card__chevron ${open ? 'q-card__chevron--open' : ''}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </span>
            </div>
            {open && (
                <div className="q-card__body">
                    <div className="q-card__section">
                        <span className="q-card__tag q-card__tag--intention">Intention</span>
                        <p>{item.intention}</p>
                    </div>
                    <div className="q-card__section">
                        <span className="q-card__tag q-card__tag--answer">Model Answer</span>
                        <p>{item.answer}</p>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Roadmap Day Card ───────────────────────────────────────────────────────────
const RoadmapDay = ({ day, index }) => {
    const status = index === 0 ? 'completed' : index === 1 ? 'active' : 'future'
    const statusLabel = index === 0 ? 'Completed' : index === 1 ? 'Active Session' : null
    const nodeClass = `roadmap-day__node--${status}`
    const cardClass = `roadmap-day__card--${status}`
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    return (
        <div className="roadmap-day">
            <div className={`roadmap-day__node ${nodeClass}`}>
                {index === 0
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12" /></svg>
                    : index + 1
                }
            </div>
            <div className={`roadmap-day__card ${cardClass}`}>
                <div className="roadmap-day__top">
                    <span className="roadmap-day__day-label">
                        Day {String(day.day).padStart(2, '0')} — {dayNames[(day.day - 1) % 7] || 'Day'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        {statusLabel && (
                            <span className={`roadmap-day__status roadmap-day__status--${status}`}>{statusLabel}</span>
                        )}
                        <span className="roadmap-day__est">120m</span>
                    </div>
                </div>
                <h3 className="roadmap-day__focus">{day.focus}</h3>
                {day.tasks && day.tasks.length > 0 && (
                    <ul className="roadmap-day__tasks">
                        {day.tasks.slice(0, 2).map((task, i) => (
                            <li key={i}>{task}</li>
                        ))}
                    </ul>
                )}
                {status === 'active' && (
                    <div className="roadmap-day__actions">
                        <button className="button emerald-button">Start Now</button>
                        <button className="button ghost-button" style={{ borderRadius: '8px', padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}>View Resources</button>
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Mock Interview Panel ────────────────────────────────────────────────────────
const MockInterviewPanel = ({ report, interviewId, evaluateMockAnswer }) => {
    const allQ = report
        ? [
            ...(report.technicalQuestions || []).map(q => ({ ...q, type: 'technical' })),
            ...(report.behavioralQuestions || []).map(q => ({ ...q, type: 'behavioral' })),
        ]
        : []

    const [qIdx, setQIdx] = useState(0)
    const [answer, setAnswer] = useState('')
    const [evaluation, setEvaluation] = useState(null)
    const [evaluating, setEvaluating] = useState(false)
    const [results, setResults] = useState([])
    const [stage, setStage] = useState('quiz')   // 'quiz' | 'complete'
    const [isListening, setIsListening] = useState(false)
    
    const recognitionRef = useRef(null)
    const mediaStreamRef = useRef(null)
    const currentQ = allQ[qIdx]
    const stoppedRef = useRef(true)
    const baseTextRef = useRef('')
    const sessionFinalRef = useRef('')
    const startFn = useRef(null)

    // Assign to ref every render — so onend always calls latest version
    startFn.current = () => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SR) {
            alert('Your browser does not support Speech Recognition. Please use Google Chrome.')
            return
        }
        if (stoppedRef.current) return

        if (recognitionRef.current) {
            try { recognitionRef.current.abort() } catch (_) {}
            recognitionRef.current = null
        }

        const rec = new SR()
        rec.continuous      = true
        rec.interimResults  = true
        rec.lang            = navigator.language || 'en-US'
        rec.maxAlternatives = 1

        rec.onstart = () => {
            setIsListening(true)
        }

        rec.onresult = (e) => {
            let sessionFinal = ''
            let sessionInterim = ''

            for (let i = 0; i < e.results.length; i++) {
                const res = e.results[i]
                if (res.isFinal) {
                    sessionFinal += res[0].transcript + ' '
                } else {
                    sessionInterim += res[0].transcript
                }
            }

            sessionFinalRef.current = sessionFinal
            const combined = (baseTextRef.current + ' ' + sessionFinal + sessionInterim).replace(/\s+/g, ' ').trim()
            setAnswer(combined)
        }

        rec.onerror = (e) => {
            console.warn('SpeechRec error:', e.error)
            if (e.error === 'no-speech' || e.error === 'aborted') return
            if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                alert('Microphone access denied. Please allow microphone permissions in browser settings.')
                stoppedRef.current = true
                setIsListening(false)
                return
            }
        }

        rec.onend = () => {
            recognitionRef.current = null
            baseTextRef.current = (baseTextRef.current + ' ' + sessionFinalRef.current).replace(/\s+/g, ' ').trim()
            sessionFinalRef.current = ''

            if (!stoppedRef.current) {
                setTimeout(() => { if (!stoppedRef.current) startFn.current?.() }, 200)
            } else {
                setIsListening(false)
            }
        }

        recognitionRef.current = rec
        try {
            rec.start()
        } catch (err) {
            if (err.name === 'InvalidStateError') {
                setTimeout(() => { if (!stoppedRef.current) startFn.current?.() }, 400)
            } else {
                console.error('SpeechRec start failed:', err)
            }
        }
    }

    const startVoice = useCallback(async () => {
        stoppedRef.current = false
        baseTextRef.current = answer
        sessionFinalRef.current = ''

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            mediaStreamRef.current = stream
        } catch (err) {
            console.error('Mic permission error:', err)
            alert('Microphone access denied or not available. Please check browser settings.')
            stoppedRef.current = true
            setIsListening(false)
            return
        }

        startFn.current?.()
    }, [answer])

    const stopVoice = useCallback(() => {
        stoppedRef.current = true
        if (recognitionRef.current) {
            try { recognitionRef.current.abort() } catch (_) {}
            recognitionRef.current = null
        }
        if (mediaStreamRef.current) {
            try { mediaStreamRef.current.getTracks().forEach(t => t.stop()) } catch (_) {}
            mediaStreamRef.current = null
        }
        setIsListening(false)
    }, [])

    const handleSubmit = useCallback(async () => {
        if (!currentQ || evaluating) return
        stopVoice()
        setEvaluating(true)
        setEvaluation(null)
        try {
            const res = await evaluateMockAnswer({
                question: currentQ.question,
                userAnswer: answer.trim() || '(no answer provided)',
                interviewId,
                questionType: currentQ.type,
            })
            setEvaluation(res)
            setResults(prev => [...prev, { question: currentQ.question, type: currentQ.type, ...res }])
        } catch {
            setEvaluation({ score: 0, verdict: 'needs_work', feedback: 'Evaluation failed. Please try again.', improvements: [], followUp: '' })
        } finally {
            setEvaluating(false)
        }
    }, [currentQ, evaluating, answer, interviewId, evaluateMockAnswer, stopVoice])

    const handleNext = useCallback(() => {
        if (qIdx + 1 >= allQ.length) { setStage('complete'); return }
        setQIdx(i => i + 1)
        setAnswer('')
        setEvaluation(null)
        setIsListening(false)
    }, [qIdx, allQ])

    const handleSkip = useCallback(() => {
        setResults(prev => [...prev, { question: currentQ?.question, type: currentQ?.type, score: 0, verdict: 'needs_work', skipped: true }])
        handleNext()
    }, [currentQ, handleNext])

    const handleRestart = () => { setQIdx(0); setAnswer(''); setEvaluation(null); setResults([]); setStage('quiz') }

    const avgScore = results.filter(r => !r.skipped).length > 0
        ? Math.round(results.filter(r => !r.skipped).reduce((a, r) => a + (r.score || 0), 0) / results.filter(r => !r.skipped).length * 10) / 10
        : 0

    const verdictColor = v => ({ excellent: '#10B981', good: '#00D4FF', average: '#F59E0B', needs_work: '#EF4444' })[v] || '#8B5CF6'

    if (stage === 'complete') return (
        <section className="mock-complete">
            <div className="mock-complete__icon">✓</div>
            <h2>Mock Interview Complete!</h2>
            <p>{results.filter(r => !r.skipped).length} of {allQ.length} questions answered</p>
            <div className="mock-complete__score">
                <span style={{ color: avgScore >= 7 ? '#10B981' : avgScore >= 5 ? '#F59E0B' : '#EF4444' }}>{avgScore}</span>
                <small>/10 avg</small>
            </div>
            <div className="mock-complete__breakdown">
                {results.map((r, i) => (
                    <div key={i} className="mock-complete__row">
                        <span className={`mock-complete__vtag mock-complete__vtag--${r.verdict || 'needs_work'}`}>
                            {r.skipped ? 'Skipped' : r.verdict?.replace('_', ' ')}
                        </span>
                        <span className="mock-complete__qtext">{r.question}</span>
                        {!r.skipped && <span className="mock-complete__score-sm" style={{ color: verdictColor(r.verdict) }}>{r.score}/10</span>}
                    </div>
                ))}
            </div>
            <div className="mock-complete__actions">
                <button className="mock-btn-primary" onClick={handleRestart}>Retry Interview</button>
            </div>
        </section>
    )

    return (
        <section className="mock-panel">
            {/* Header */}
            <div className="mock-panel__header">
                <div className="mock-panel__header-left">
                    <h2>Mock Interview</h2>
                    <span className="mock-panel__sub">AI evaluates your answers in real-time</span>
                </div>
                <div className="mock-panel__progress-wrap">
                    <span className="mock-panel__q-count">Q{qIdx + 1} / {allQ.length}</span>
                    <div className="mock-panel__progress-bar">
                        <div className="mock-panel__progress-fill" style={{ width: `${((qIdx + 1) / allQ.length) * 100}%` }} />
                    </div>
                </div>
            </div>

            {/* Two-column layout */}
            <div className="mock-panel__body">

                {/* LEFT — Question + Answer */}
                <div className="mock-panel__left">
                    {/* Question card */}
                    <div className="mock-q-card">
                        <div className="mock-q-card__meta">
                            <span className={`mock-q-card__type mock-q-card__type--${currentQ?.type}`}>{currentQ?.type}</span>
                            <span className="mock-q-card__num">Question {qIdx + 1}</span>
                        </div>
                        <p className="mock-q-card__text">{currentQ?.question}</p>
                    </div>

                    {/* Answer area */}
                    {!evaluation && (
                        <div className="mock-answer-area">
                            <div className="mock-answer-area__label">
                                <span>Your Answer</span>
                                <button
                                    className={`mock-mic-btn ${isListening ? 'mock-mic-btn--active' : ''}`}
                                    onClick={isListening ? stopVoice : startVoice}
                                    title={isListening ? 'Stop recording' : 'Start voice input'}
                                >
                                    {isListening ? '⏹ Stop' : '🎤 Speak'}
                                </button>
                            </div>
                            <textarea
                                className="mock-textarea"
                                placeholder="Type your answer here, or click 🎤 Speak to use voice input..."
                                value={answer}
                                onChange={e => setAnswer(e.target.value)}
                                disabled={evaluating}
                                rows={6}
                            />
                            {isListening && (
                                <div className="mock-listening-indicator">
                                    <span className="mock-listening-dot" />
                                    Listening... speak your answer
                                </div>
                            )}
                            <div className="mock-answer-footer">
                                <span className="mock-word-count">{answer.trim() ? answer.trim().split(/\s+/).filter(Boolean).length : 0} words</span>
                                <div className="mock-action-btns">
                                    <button className="mock-btn-skip" onClick={handleSkip} disabled={evaluating}>Skip →</button>
                                    <button className="mock-btn-submit" onClick={handleSubmit} disabled={evaluating || (!answer.trim())}>
                                        {evaluating
                                            ? <><span className="mock-spinner" /> Evaluating...</>
                                            : '✓ Submit Answer'
                                        }
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Evaluation result */}
                    {evaluation && (
                        <div className={`mock-eval-card mock-eval-card--${evaluation.verdict}`}>
                            <div className="mock-eval-card__header">
                                <h3>AI Evaluation</h3>
                                <div className="mock-eval-score">
                                    <span className="mock-eval-score__num" style={{ color: verdictColor(evaluation.verdict) }}>
                                        {evaluation.score}
                                    </span>
                                    <span className="mock-eval-score__denom">/10</span>
                                    <span className="mock-eval-score__verdict" style={{ background: `${verdictColor(evaluation.verdict)}20`, color: verdictColor(evaluation.verdict), border: `1px solid ${verdictColor(evaluation.verdict)}40` }}>
                                        {evaluation.verdict?.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>

                            <p className="mock-eval-feedback">{evaluation.feedback}</p>

                            {evaluation.improvements?.length > 0 && (
                                <div className="mock-eval-improvements">
                                    <div className="mock-eval-improvements__label">Improvements</div>
                                    {evaluation.improvements.map((imp, i) => (
                                        <div key={i} className="mock-eval-imp-item">↗ {imp}</div>
                                    ))}
                                </div>
                            )}

                            {evaluation.followUp && (
                                <div className="mock-eval-followup">
                                    <span className="mock-eval-followup__label">Follow-up question</span>
                                    <p>{evaluation.followUp}</p>
                                </div>
                            )}

                            <button className="mock-btn-next" onClick={handleNext}>
                                {qIdx + 1 >= allQ.length ? '✓ Finish Session' : 'Next Question →'}
                            </button>
                        </div>
                    )}
                </div>

                {/* RIGHT — Hint / Model Answer */}
                <div className="mock-panel__right">
                    <div className="mock-hint-card">
                        <div className="mock-hint-card__label">💡 Interviewer Intent</div>
                        <p className="mock-hint-card__text">{currentQ?.intention}</p>
                    </div>
                    {evaluation && (
                        <div className="mock-hint-card mock-hint-card--answer">
                            <div className="mock-hint-card__label">📖 Model Answer</div>
                            <p className="mock-hint-card__text">{currentQ?.answer}</p>
                        </div>
                    )}
                    <div className="mock-sessions-summary">
                        <div className="mock-sessions-summary__label">Session Progress</div>
                        {results.map((r, i) => (
                            <div key={i} className="mock-sessions-summary__item">
                                <span className="mock-sessions-summary__num">Q{i + 1}</span>
                                <div className="mock-sessions-summary__bar">
                                    <div className="mock-sessions-summary__fill"
                                        style={{ width: r.skipped ? '0%' : `${(r.score / 10) * 100}%`, background: verdictColor(r.verdict) }}
                                    />
                                </div>
                                <span className="mock-sessions-summary__score" style={{ color: verdictColor(r.verdict) }}>
                                    {r.skipped ? '-' : `${r.score}/10`}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}

// ── Main Component ─────────────────────────────────────────────────────────────
const Interview = () => {
    const [activeNav, setActiveNav] = useState('overview')
    const { report, getReportById, loading, getResumePdf, chatWithAI, evaluateMockAnswer } = useInterview()
    const { handleLogout, user } = useAuth()
    const { interviewId } = useParams()
    const navigate = useNavigate()

    // Chat state
    const [chatOpen, setChatOpen] = useState(false)
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hi! I\'m PrepIQ Coach. How can I help you adjust your preparation plan or answer questions about your interview?' }
    ])
    const [inputValue, setInputValue] = useState('')
    const [chatLoading, setChatLoading] = useState(false)
    const chatEndRef = useRef(null)

    useEffect(() => {
        if (interviewId) getReportById(interviewId)
    }, [interviewId])

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, chatLoading])

    const handleSendMessage = async (msgText) => {
        const textToSend = msgText || inputValue
        if (!textToSend.trim() || chatLoading) return

        const userMsg = { role: 'user', content: textToSend }
        setMessages(prev => [...prev, userMsg])
        setInputValue('')
        setChatLoading(true)

        try {
            const history = messages.slice(1).map(m => ({ role: m.role, content: m.content }))
            const res = await chatWithAI({ interviewId, message: textToSend, chatHistory: [...history, userMsg] })
            setMessages(prev => [...prev, { role: 'assistant', content: res.response }])
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: 'I encountered an error. Please try again.' }])
        } finally {
            setChatLoading(false)
        }
    }

    const handleLogoutClick = async () => {
        await handleLogout()
        navigate('/login')
    }

    if (loading || !report) {
        return (
            <main className="loading-screen">
                <div className="loading-spinner" />
                <h1>Loading your interview plan...</h1>
            </main>
        )
    }

    const scoreColor = report.matchScore >= 80 ? 'high' : report.matchScore >= 60 ? 'mid' : 'low'

    // Derive role title from report
    const roleTitle = report.title || 'Senior Product Designer'
    const profileId = `${Math.floor(Math.random() * 900) + 100}-PIQ`

    // Get focus areas from skill gaps for right panel
    const focusAreas = report.skillGaps?.slice(0, 6).map((g, i) => ({
        label: g.skill,
        color: g.severity === 'high' ? 'red' : g.severity === 'medium' ? 'amber' : 'green'
    })) || []

    return (
        <div className="interview-page">

            {/* ── Sidebar ── */}
            <aside className="interview-sidebar">
                <div className="interview-sidebar__logo">
                    <div className="interview-sidebar__logo-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                    </div>
                    <div>
                        <div className="interview-sidebar__logo-text">PrepIQ</div>
                        <div className="interview-sidebar__logo-sub">Intelligence Systems</div>
                    </div>
                </div>

                <nav className="interview-sidebar__nav">
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.id}
                            id={`nav-${item.id}`}
                            className={`interview-sidebar__nav-item ${activeNav === item.id ? 'interview-sidebar__nav-item--active' : ''}`}
                            onClick={() => setActiveNav(item.id)}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="interview-sidebar__bottom">
                    <button className="interview-sidebar__upgrade">Upgrade to Pro</button>
                    <button className="interview-sidebar__bottom-btn">
                        <IconHelp /> Help Center
                    </button>
                    <button className="interview-sidebar__bottom-btn" onClick={handleLogoutClick}>
                        <IconLogout /> Log Out
                    </button>
                </div>
            </aside>

            {/* ── Main body ── */}
            <div className="interview-body">

                {/* Top header */}
                <div className="interview-header">
                    <div className="interview-header__left">
                        <h1 className="interview-header__role">{roleTitle}</h1>
                        <p className="interview-header__id">Candidate Profile ID: {profileId}</p>
                    </div>
                    <div className="interview-header__actions">
                        <button
                            id="download-resume-btn"
                            className="button primary-button"
                            style={{ borderRadius: '12px', fontSize: '0.85rem', padding: '0.65rem 1.25rem' }}
                            onClick={() => getResumePdf(interviewId)}
                        >
                            <IconDownload />
                            Download ATS Resume
                        </button>
                    </div>
                </div>

                {/* Content layout */}
                <div className="interview-content-layout">

                    {/* ── Main scroll area ── */}
                    <main className="interview-main">

                        {/* OVERVIEW / DASHBOARD */}
                        {activeNav === 'overview' && (
                            <>
                                {/* Face Interview CTA Banner */}
                                <div
                                    id="face-interview-cta"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(99,102,241,0.08))',
                                        border: '1px solid rgba(139,92,246,0.25)',
                                        borderRadius: '18px',
                                        padding: '1.25rem 1.5rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '1rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        marginBottom: '0.5rem',
                                    }}
                                    onClick={() => navigate(`/interview/${interviewId}/face-mock`)}
                                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 28px rgba(139,92,246,0.2)'}
                                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{
                                            width: 46, height: 46,
                                            borderRadius: 14,
                                            background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.3))',
                                            border: '1px solid rgba(139,92,246,0.3)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#8B5CF6',
                                        }}>
                                            <IconVideo />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.2rem', color: '#F8FAFC' }}>🎥 Face Interview Mode</div>
                                            <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.4)' }}>Live facial expression + voice analysis · AI behavioral scoring</div>
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: '0.55rem 1.2rem',
                                        background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                                        borderRadius: 10,
                                        fontSize: '0.82rem',
                                        fontWeight: 700,
                                        color: 'white',
                                        whiteSpace: 'nowrap',
                                        boxShadow: '0 4px 18px rgba(139,92,246,0.3)',
                                        flexShrink: 0,
                                    }}>
                                        Start Now →
                                    </div>
                                </div>
                                {/* Stat Cards */}
                                <div className="stat-cards">
                                    {/* Match Score */}
                                    <div className="stat-card stat-card--score">
                                        <p className="stat-card__label">Match Score</p>
                                        <div className="stat-card__score-row">
                                            <ScoreRing score={report.matchScore} />
                                            <div className="stat-card__score-info">
                                                <h3>Target Meta-Level</h3>
                                                <p>Overall alignment</p>
                                                <span className="stat-card__delta">+12% from last mock</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Solved Queries */}
                                    <div className="stat-card stat-card--progress">
                                        <div className="stat-card__icon">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                                                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                                            </svg>
                                        </div>
                                        <div className="stat-card__label-row">
                                            <span className="stat-card__big-label">Solved Queries</span>
                                        </div>
                                        <div className="stat-card__number">
                                            {report.technicalQuestions.length + report.behavioralQuestions.length} / 200
                                        </div>
                                        <div className="stat-card__bar">
                                            <div className="stat-card__bar-fill" style={{ width: `${Math.min(((report.technicalQuestions.length + report.behavioralQuestions.length) / 200) * 100, 100)}%` }} />
                                        </div>
                                    </div>

                                    {/* Critical Gaps */}
                                    <div className="stat-card stat-card--gaps">
                                        <div className="stat-card__icon">
                                            <IconZap />
                                        </div>
                                        <p className="stat-card__label">Critical Gaps</p>
                                        <div className="stat-card__big-number">
                                            {report.skillGaps?.filter(g => g.severity === 'high').length || 0}
                                        </div>
                                        <div className="stat-card__gap-label">Action Items</div>
                                        <p className="stat-card__gap-sub">Requires immediate focus</p>
                                    </div>
                                </div>

                                {/* 7-Day Roadmap in Overview */}
                                <div className="roadmap-section">
                                    <div className="roadmap-section__header">
                                        <h2>7-Day Intelligent Roadmap</h2>
                                        <span className="phase-badge">Phase 2: Execution</span>
                                    </div>
                                    <div className="roadmap-timeline">
                                        {report.preparationPlan.map((day, i) => (
                                            <RoadmapDay key={day.day} day={day} index={i} />
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* TECHNICAL QUESTIONS */}
                        {activeNav === 'technical' && (
                            <section>
                                <div className="section-header">
                                    <h2>Technical Questions</h2>
                                    <span className="section-badge">{report.technicalQuestions.length} questions</span>
                                </div>
                                <div className="q-list">
                                    {report.technicalQuestions.map((q, i) => (
                                        <QuestionCard key={i} item={q} index={i} type="technical" />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* BEHAVIORAL QUESTIONS */}
                        {activeNav === 'behavioral' && (
                            <section>
                                <div className="section-header">
                                    <h2>Behavioral Questions</h2>
                                    <span className="section-badge">{report.behavioralQuestions.length} questions</span>
                                </div>
                                <div className="q-list">
                                    {report.behavioralQuestions.map((q, i) => (
                                        <QuestionCard key={i} item={q} index={i} type="behavioral" />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* SKILL GAPS / LIBRARY */}
                        {activeNav === 'gaps' && (
                            <section>
                                <div className="section-header">
                                    <h2>Skill Gap Analysis</h2>
                                    <span className="section-badge">{report.skillGaps?.length || 0} gaps</span>
                                </div>
                                <div className="skill-gaps-grid">
                                    {report.skillGaps?.map((gap, i) => (
                                        <span key={i} className={`skill-tag skill-tag--${gap.severity}`}>
                                            {gap.skill}
                                        </span>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* ROADMAP PAGE */}
                        {activeNav === 'roadmap' && (
                            <section>
                                <div className="roadmap-section__header">
                                    <h2>7-Day Intelligent Roadmap</h2>
                                    <span className="phase-badge">Phase 2: Execution</span>
                                </div>
                                <div className="roadmap-timeline">
                                    {report.preparationPlan.map((day, i) => (
                                        <RoadmapDay key={day.day} day={day} index={i} />
                                    ))}
                                </div>
                            </section>
                        )}
                        {/* TEXT MOCK INTERVIEW PANEL */}
                        {activeNav === 'mock' && (
                            <MockInterviewPanel
                                report={report}
                                interviewId={interviewId}
                                evaluateMockAnswer={evaluateMockAnswer}
                            />
                        )}

                        {/* FACE INTERVIEW NAV SHORTCUT */}
                        {activeNav === 'face' && (
                            <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60%' }}>
                                <div style={{ textAlign: 'center', maxWidth: 420 }}>
                                    <div style={{
                                        width: 80, height: 80, borderRadius: 24,
                                        background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.25))',
                                        border: '1px solid rgba(139,92,246,0.25)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 1.5rem', color: '#8B5CF6',
                                        boxShadow: '0 0 40px rgba(139,92,246,0.15)'
                                    }}>
                                        <IconVideo style={{ width: 36, height: 36 }} />
                                    </div>
                                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem', background: 'linear-gradient(135deg, #8B5CF6, #00D4FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Face Interview Mode</h2>
                                    <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.4)', marginBottom: '2rem', lineHeight: 1.65 }}>Experience a real interview with AI analyzing your facial expressions, eye contact, nervousness levels, and voice in real-time.</p>
                                    <button
                                        id="launch-face-interview-btn"
                                        style={{
                                            padding: '1rem 2.5rem',
                                            background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                                            color: 'white', border: 'none', borderRadius: 14,
                                            fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                                            boxShadow: '0 4px 24px rgba(139,92,246,0.35)',
                                            transition: 'all 0.2s ease',
                                            fontFamily: 'Inter, sans-serif',
                                            display: 'inline-flex', alignItems: 'center', gap: '0.6rem'
                                        }}
                                        onClick={() => navigate(`/interview/${interviewId}/face-mock`)}
                                    >
                                        🎥 Launch Face Interview
                                    </button>
                                </div>
                            </section>
                        )}
                    </main>

                    {/* ── Right Panel ── */}
                    <aside className="interview-right">

                        {/* Focus Areas = Skill Gaps summary */}
                        <div>
                            <div className="right-panel__section-title">
                                Focus Areas
                                <a href="#" onClick={e => { e.preventDefault(); setActiveNav('gaps') }}>Analyze All</a>
                            </div>
                            <div className="right-panel__tags">
                                {report.skillGaps?.slice(0, 6).map((gap, i) => (
                                    <span
                                        key={i}
                                        className={`right-panel__tag right-panel__tag--${gap.severity === 'high' ? 'red' : gap.severity === 'medium' ? 'amber' : 'green'}`}
                                        onClick={() => setActiveNav('gaps')}
                                    >
                                        {gap.skill}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="section-divider" style={{ margin: '0' }} />

                        {/* Recent Intelligence */}
                        <div>
                            <div className="right-panel__section-title">Recent Intelligence</div>
                            <div className="recent-intel-list">
                                <div className="intel-item">
                                    <div className="intel-item__icon intel-item__icon--emerald">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                                    </div>
                                    <div className="intel-item__content">
                                        <div className="intel-item__title">Plan Generated</div>
                                        <div className="intel-item__desc">Your 7-day interview strategy is ready</div>
                                        <div className="intel-item__time">Just now</div>
                                    </div>
                                </div>
                                <div className="intel-item">
                                    <div className="intel-item__icon intel-item__icon--cyan">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                    </div>
                                    <div className="intel-item__content">
                                        <div className="intel-item__title">New Insight Unlocked</div>
                                        <div className="intel-item__desc">AI detected a pattern in your architecture answers. New module suggested.</div>
                                        <div className="intel-item__time">2 hours ago</div>
                                    </div>
                                </div>
                                <div className="intel-item">
                                    <div className="intel-item__icon intel-item__icon--indigo">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                    </div>
                                    <div className="intel-item__content">
                                        <div className="intel-item__title">Coach Available</div>
                                        <div className="intel-item__desc">Click the chat bubble to ask PrepIQ Coach anything about your plan.</div>
                                        <div className="intel-item__time">Always</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            {/* ── Floating Chat Widget ── */}
            <div className="chat-widget">
                {!chatOpen ? (
                    <button id="chat-open-btn" className="chat-trigger" onClick={() => setChatOpen(true)}>
                        <span className="chat-trigger__pulse" />
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                    </button>
                ) : (
                    <div className="chat-window">
                        <div className="chat-header">
                            <div className="chat-header__info">
                                <span className="chat-header__avatar">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                    </svg>
                                </span>
                                <div>
                                    <h4 className="chat-header__title">PrepIQ Coach</h4>
                                    <span className="chat-header__status">Online & ready</span>
                                </div>
                            </div>
                            <button className="chat-close" id="chat-close-btn" onClick={() => setChatOpen(false)}>✕</button>
                        </div>

                        <div className="chat-messages">
                            {messages.map((m, i) => (
                                <div key={i} className={`chat-message chat-message--${m.role}`}>
                                    <div className="chat-message__bubble">{m.content}</div>
                                </div>
                            ))}
                            {chatLoading && (
                                <div className="chat-message chat-message--assistant">
                                    <div className="chat-message__bubble">
                                        <span className="dot-loader"><span/><span/><span/></span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        <div className="chat-suggestions">
                            {SUGGESTIONS.map((s, i) => (
                                <button key={i} className="suggestion-chip" onClick={() => handleSendMessage(s)}>{s}</button>
                            ))}
                        </div>

                        <form className="chat-input-area" onSubmit={e => { e.preventDefault(); handleSendMessage() }}>
                            <input
                                id="chat-input"
                                type="text"
                                placeholder="Ask to modify plan, add questions..."
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                disabled={chatLoading}
                            />
                            <button type="submit" disabled={chatLoading || !inputValue.trim()}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                    <line x1="22" y1="2" x2="11" y2="13"/>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                                </svg>
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Interview