import React, { useState, useRef, useEffect } from 'react'
import '../style/home.scss'
import { useInterview } from '../hooks/useInterview.js'
import { useNavigate } from 'react-router'
import { useAuth } from '../../auth/hooks/useAuth'

const FEATURES = [
    {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
        ),
        color: 'cyan',
        title: 'Resume Analysis',
        desc: 'Deep scanning for keywords, formatting, flows, and semantic AI signals.'
    },
    {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
            </svg>
        ),
        color: 'emerald',
        title: 'Match Score',
        desc: 'Precise identification of alignment between your profile and any job AI.'
    },
    {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
        ),
        color: 'amber',
        title: 'Skill Gaps',
        desc: 'Proactive identification of missing credentials and recommended resources.'
    },
    {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
        ),
        color: 'indigo',
        title: '7-Day Prep Roadmap',
        desc: 'Custom day-by-day preparation schedule built around your unique gaps.'
    },
    {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
        ),
        color: 'violet',
        title: 'Live Mock',
        desc: 'Interactive AI voice sessions with sentiment and live feedback.'
    },
]

const Home = () => {
    const { loading, error, generateReport, reports, getReports } = useInterview()
    const { handleLogout } = useAuth()
    const [jobDescription, setJobDescription] = useState('')
    const [selfDescription, setSelfDescription] = useState('')
    const [selectedFile, setSelectedFile] = useState(null)
    const [charCount, setCharCount] = useState(0)
    const resumeInputRef = useRef()
    const navigate = useNavigate()

    useEffect(() => { getReports() }, [])

    const [validationErrors, setValidationErrors] = useState({})

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            setSelectedFile(file)
            setValidationErrors(prev => ({ ...prev, resume: null }))
        }
    }

    const handleRemoveFile = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setSelectedFile(null)
        resumeInputRef.current.value = ''
    }

    const handleJobDescChange = (e) => {
        setJobDescription(e.target.value)
        setCharCount(e.target.value.length)
        const words = e.target.value.trim().split(/\s+/).filter(w => w.length > 1)
        if (e.target.value.trim().length >= 80 && words.length >= 8) {
            setValidationErrors(prev => ({ ...prev, jd: null }))
        }
    }

    const handleGenerateReport = async () => {
        const resumeFile = resumeInputRef.current.files[0]
        const errors = {}

        // Validate JD — must be meaningful: at least 80 chars AND 8+ real words
        const jdTrimmed = jobDescription.trim()
        const jdWords   = jdTrimmed.split(/\s+/).filter(w => w.length > 1)
        if (!jdTrimmed) {
            errors.jd = 'Job description is required.'
        } else if (jdTrimmed.length < 80) {
            errors.jd = `Job description is too short (${jdTrimmed.length}/80 chars). Please paste the actual job description.`
        } else if (jdWords.length < 8) {
            errors.jd = `That doesn't look like a real job description (only ${jdWords.length} words found). Please paste the actual JD text.`
        }

        // Validate that at least resume or self-description is provided
        if (!resumeFile && !selfDescription.trim()) {
            errors.profile = 'Please upload your resume PDF or write a self description — at least one is required.'
        }

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors)
            // Scroll to the form
            document.getElementById('start-form')?.scrollIntoView({ behavior: 'smooth' })
            return
        }

        setValidationErrors({})
        const interviewReport = await generateReport({ jobDescription, selfDescription, resumeFile })
        if (interviewReport?._id) navigate(`/interview/${interviewReport._id}`)
    }

    const handleLogoutClick = async () => {
        await handleLogout()
        navigate('/login')
    }

    if (loading) {
        return (
            <main className="loading-screen">
                <div className="loading-spinner" />
                <h1>Analyzing your profile & building your strategy...</h1>
                <p className="loading-sub">This usually takes about 30 seconds</p>
            </main>
        )
    }

    return (
        <div className="home-page">

            {/* ── Navigation ── */}
            <nav className="home-nav">
                <a href="/" className="home-nav__logo">
                    <div className="home-nav__logo-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                    </div>
                    <span className="home-nav__logo-text">PrepIQ</span>
                </a>

                <ul className="home-nav__links">
                    {['Recent', 'Intelligence', 'Pricing', 'Resources'].map(l => (
                        <li key={l}><a href="#">{l}</a></li>
                    ))}
                </ul>

                <div className="home-nav__actions">
                    <button id="nav-logout-btn" className="button ghost-button" onClick={handleLogoutClick}>Log Out</button>
                    <button className="button primary-button" onClick={() => document.getElementById('start-form')?.scrollIntoView({ behavior: 'smooth' })}>
                        Launch App
                    </button>
                </div>
            </nav>

            {/* ── Hero ── */}
            <section className="hero">
                <div className="hero__blob hero__blob--1" />
                <div className="hero__blob hero__blob--2" />
                <div className="hero__blob hero__blob--3" />

                <div className="hero__badge">
                    ✦ Intelligence Layer Beta — Now Live
                </div>

                <h1 className="hero__headline">
                    <span className="gradient-line">Your AI Interview</span>
                    Intelligence Layer
                </h1>

                <p className="hero__sub">
                    The ultimate preparation cockpit. Leverage generative AI to analyze resumes,
                    bridge skill gaps, and master mock interviews with real-time feedback.
                </p>

                <div className="hero__actions">
                    <button
                        id="hero-cta-btn"
                        className="button primary-button"
                        style={{ fontSize: '1rem', padding: '0.85rem 2rem' }}
                        onClick={() => document.getElementById('start-form')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                        Start Analyzing Free
                    </button>
                    <button className="button ghost-button" style={{ fontSize: '1rem', padding: '0.85rem 1.5rem' }}>
                        View Demo Report
                    </button>
                </div>

                <div className="hero__trust">
                    <span>No credit card needed</span>
                    <span>Works with any job description</span>
                    <span>Instant AI analysis</span>
                </div>

                {/* Mock Dashboard Preview */}
                <div className="hero__preview">
                    <div className="hero__preview-frame">
                        <div className="hero__preview-mock">
                            <div className="mock-sidebar">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="mock-nav-item" />
                                ))}
                            </div>
                            <div className="mock-content">
                                <div className="mock-stats">
                                    <div className="mock-stat">
                                        <span className="mock-stat-num">84%</span>
                                        <span className="mock-stat-label">Match Score</span>
                                    </div>
                                    <div className="mock-stat">
                                        <span className="mock-stat-num">2</span>
                                        <span className="mock-stat-label">Gaps Found</span>
                                    </div>
                                    <div className="mock-stat">
                                        <span className="mock-stat-num">24</span>
                                        <span className="mock-stat-label">Questions</span>
                                    </div>
                                </div>
                                <div className="mock-roadmap">
                                    {['Day 1 — Fundamentals', 'Day 2 — Deep Dive', 'Day 3 — Behavioral'].map((d, i) => (
                                        <div key={i} className="mock-day">
                                            <div className="mock-day-text" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="mock-right">
                                <div className="mock-tags">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="mock-tag" style={{ width: `${50 + i * 15}px` }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="hero__preview-glow" />
                </div>
            </section>

            {/* ── Features ── */}
            <section className="features">
                <p className="features__label">What PrepIQ Does</p>
                <h2 className="features__heading">Supercharge Every Phase</h2>
                <div className="features__grid">
                    {FEATURES.map(f => (
                        <div key={f.title} className="features__card">
                            <div className={`features__card-icon features__card-icon--${f.color}`}>
                                {f.icon}
                            </div>
                            <h3 className="features__card-title">{f.title}</h3>
                            <p className="features__card-desc">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Input Form ── */}
            <section id="start-form" className="home-form-section">
                <div className="home-form-section__inner">
                    <h2 className="home-form-section__heading">Ready for an Instant Audit?</h2>
                    <p className="home-form-section__sub">
                        Upload your resume and a target job to see the magic.
                    </p>

                    <div className="form-card">
                        {error && (
                            <div className="error-banner" style={{ marginBottom: '1rem' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="form-card__columns">
                            {/* Left — Resume upload */}
                            <div>
                                <div className="form-card__label" style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    Drop Resume Here
                                    <span className="form-card__optional">Best Results</span>
                                </div>

                                {selectedFile ? (
                                    <div className="dropzone dropzone--selected">
                                        <span className="dropzone__icon dropzone__icon--success">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                        </span>
                                        <p className="dropzone__filename">{selectedFile.name}</p>
                                        <p className="dropzone__subtitle">{(selectedFile.size / 1024).toFixed(1)} KB · PDF</p>
                                        <button className="dropzone__remove" onClick={handleRemoveFile}>✕ Remove</button>
                                    </div>
                                ) : (
                                    <label className="dropzone" htmlFor="resume">
                                        <span className="dropzone__icon dropzone__icon--cyan">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                                        </span>
                                        <p className="dropzone__title">Drop Resume Here</p>
                                        <p className="dropzone__subtitle">PDF or DOCX up to 10MB</p>
                                    </label>
                                )}
                                <input ref={resumeInputRef} onChange={handleFileChange} hidden type="file" id="resume" name="resume" accept=".pdf" />

                                {/* Self description */}
                                <div style={{ marginTop: '1rem' }}>
                                    <div className="form-card__label" style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        Self Description
                                        <span className="form-card__optional">Optional if resume uploaded</span>
                                    </div>
                                    <textarea
                                        className="home-textarea"
                                        style={{ minHeight: '80px', borderColor: validationErrors.profile ? 'rgba(239,68,68,0.5)' : undefined }}
                                        placeholder="Briefly describe your experience if you don't have a resume..."
                                        onChange={e => { setSelfDescription(e.target.value); if (e.target.value.trim()) setValidationErrors(prev => ({ ...prev, profile: null })) }}
                                    />
                                    {validationErrors.profile && (
                                        <div className="form-validation-error">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                            {validationErrors.profile}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right — JD textarea */}
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div className="form-card__label" style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    Target Job Description
                                    <span className="form-card__required">Required</span>
                                </div>
                                <textarea
                                    className="home-textarea"
                                    style={{ flex: 1, minHeight: '220px', borderColor: validationErrors.jd ? 'rgba(239,68,68,0.5)' : undefined }}
                                    placeholder="Paste the full job description here — the more detail, the better the analysis..."
                                    onChange={handleJobDescChange}
                                    maxLength={5000}
                                />
                                <div className="char-counter" style={{ color: charCount > 0 && charCount < 80 ? '#EF4444' : charCount >= 80 ? '#10B981' : undefined }}>
                                    {charCount} / 5000 chars
                                    {charCount > 0 && charCount < 80 && <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>— min 80 chars needed</span>}
                                    {charCount >= 80 && <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>✓ Good length</span>}
                                </div>

                                {validationErrors.jd && (
                                    <div className="form-validation-error">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                        {validationErrors.jd}
                                    </div>
                                )}

                                <div className="info-box" style={{ marginTop: '0.75rem' }}>
                                    <span className="info-box__icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" stroke="#07070F" strokeWidth="2"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="#07070F" strokeWidth="2"/></svg>
                                    </span>
                                    <p>Paste the <strong>complete job description</strong> for the most accurate match score and interview questions.</p>
                                </div>
                            </div>
                        </div>

                        <button id="generate-btn" className="generate-btn" onClick={handleGenerateReport} disabled={loading}>
                            {loading ? (
                                <>
                                    <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                                    Analysing...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                                    Analyse Alignment
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </section>

            {/* ── Recent Reports ── */}
            {reports.length > 0 && (
                <section className="recent-reports">
                    <div className="recent-reports__header">
                        <h2>Recent Intelligence Reports</h2>
                        <a href="#">View All →</a>
                    </div>
                    <ul className="reports-list">
                        {reports.map(report => (
                            <li
                                key={report._id}
                                className="report-item"
                                id={`report-${report._id}`}
                                onClick={() => navigate(`/interview/${report._id}`)}
                            >
                                <h3>{report.title || 'Untitled Position'}</h3>
                                <p className="report-meta">{new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                <span className={`match-score ${report.matchScore >= 80 ? 'score--high' : report.matchScore >= 60 ? 'score--mid' : 'score--low'}`}>
                                    {report.matchScore}% Match
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* ── Footer ── */}
            <footer className="home-footer">
                <span className="home-footer__logo">PrepIQ</span>
                <div className="home-footer__links">
                    {['Privacy Policy', 'Terms of Service', 'Security', 'Status'].map(l => (
                        <a key={l} href="#">{l}</a>
                    ))}
                </div>
                <span className="home-footer__copy">© 2024 PrepIQ Intelligence Systems. All rights reserved.</span>
            </footer>
        </div>
    )
}

export default Home