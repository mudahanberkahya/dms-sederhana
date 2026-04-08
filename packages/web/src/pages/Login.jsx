import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { authClient } from '../lib/auth';
import './Login.css';

export default function Login() {
    const navigate = useNavigate();
    const [showPw, setShowPw] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const { data, error: authError } = await authClient.signIn.email({
                email,
                password
            });

            if (authError) {
                setError(authError.message || 'Invalid email or password');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            if (err.message && err.message.includes('fetch')) {
                setError('Cannot connect to the backend server. Is it running?');
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-bg-pattern" />
            <div className="login-card animate-fade-in">
                {/* Hotel Logo Space */}
                <div className="login-logo">
                    <div className="login-logo-image">
                        <Building2 size={32} strokeWidth={1.5} />
                    </div>
                    <h1 className="login-title">DMS</h1>
                    <p className="login-subtitle">Document Management System</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="you@hotel.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <div className="password-wrapper">
                            <input
                                type={showPw ? 'text' : 'password'}
                                className="form-input"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPw(!showPw)}
                            >
                                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {error && <div className="login-error" style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

                    <div className="login-options">
                        <label className="remember-me">
                            <input type="checkbox" />
                            <span>Remember me</span>
                        </label>
                    </div>

                    <button type="submit" className="btn btn-primary login-btn" disabled={isLoading}>
                        {isLoading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Sign In'}
                    </button>
                </form>

                <div className="login-footer">
                    <span>Hotel Operations Platform</span>
                </div>
            </div>
        </div>
    );
}
