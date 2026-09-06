import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router'
import '../auth.form.scss'
import { useAuth } from '../hooks/useAuth'

const AuthPage = () => {
    const location = useLocation()
    const isRegisterRoute = location.pathname === '/register'

    const [tab, setTab] = useState(isRegisterRoute ? 'register' : 'login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [username, setUsername] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const { handleLogin, handleRegister } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            if (tab === 'login') {
                await handleLogin({ email, password })
            } else {
                await handleRegister({ username, email, password })
            }
            navigate('/')
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-page">
            {/* Animated background blobs */}
            <div className="auth-blob auth-blob--1" />
            <div className="auth-blob auth-blob--2" />
            <div className="auth-blob auth-blob--3" />

            <div className="auth-card">
                {/* Logo */}
                <div className="auth-logo">
                    <div className="auth-logo__icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                    </div>
                    <span className="auth-logo__name">PrepIQ</span>
                    <span className="auth-logo__subtitle">Intelligence Systems v4.0</span>
                </div>

                {/* Tabs */}
                <div className="auth-tabs">
                    <button
                        id="tab-signin"
                        className={`auth-tab ${tab === 'login' ? 'auth-tab--active' : ''}`}
                        onClick={() => { setTab('login'); setError('') }}
                        type="button"
                    >
                        Sign In
                    </button>
                    <button
                        id="tab-register"
                        className={`auth-tab ${tab === 'register' ? 'auth-tab--active' : ''}`}
                        onClick={() => { setTab('register'); setError('') }}
                        type="button"
                    >
                        Create Account
                    </button>
                </div>

                {/* Form */}
                <form id="auth-form" className="auth-form" onSubmit={handleSubmit}>
                    {tab === 'register' && (
                        <div className="auth-field">
                            <input
                                id="username"
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                                autoComplete="username"
                            />
                        </div>
                    )}

                    <div className="auth-field">
                        <input
                            id="email"
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="auth-field">
                        <input
                            id="password"
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                        />
                    </div>

                    {tab === 'login' && (
                        <div className="auth-forgot">
                            <a href="#">Forgot password?</a>
                        </div>
                    )}

                    {error && <div className="auth-error">{error}</div>}

                    <button
                        id="auth-submit-btn"
                        type="submit"
                        className="auth-submit"
                        disabled={loading}
                    >
                        {loading
                            ? (tab === 'login' ? 'Signing in...' : 'Creating account...')
                            : (tab === 'login' ? 'Launch App' : 'Create Account')
                        }
                    </button>
                </form>

                <div className="auth-divider">or continue with</div>

                {/* Google OAuth button */}
                <button 
                    id="google-auth-btn" 
                    className="auth-google" 
                    type="button"
                    onClick={() => {
                        const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"
                        window.location.href = `${baseUrl}/api/auth/google`
                    }}
                >
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                </button>

                {/* Footer */}
                <div className="auth-footer">
                    <a href="#">Privacy</a>
                    <span>© 2024 PrepIQ</span>
                    <a href="#">Terms</a>
                </div>
            </div>
        </div>
    )
}

export default AuthPage