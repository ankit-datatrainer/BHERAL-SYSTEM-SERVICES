'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Please enter your User ID.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    if (!password) {
      setError('Please enter your Password.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push(returnUrl);
        router.refresh();
      } else {
        setError(data.error || 'Invalid credentials. Access denied.');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch {
      setError('Network error. Unable to reach security gateway.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bss-login-wrapper">
      {/* Soft ambient background orbs */}
      <div className="bss-login-glow bss-login-glow-1" />
      <div className="bss-login-glow bss-login-glow-2" />

      <div className={`bss-login-card ${shake ? 'bss-shake' : ''}`}>
        {/* Brand Header */}
        <div className="bss-brand-header">
          <div className="bss-icon-badge">
            <span className="material-symbols-outlined bss-lock-icon">lock</span>
          </div>

          <div className="bss-pill-badge">
            <span className="bss-pulse-dot" />
            Protected Portal Gateway
          </div>

          <h1 className="bss-title">Bheral Systems & Services</h1>
          <p className="bss-subtitle">
            Enter your authorized credentials to access and explore the platform.
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="bss-error-alert" role="alert">
            <span className="material-symbols-outlined bss-error-icon">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bss-form">
          {/* User ID Field */}
          <div className="bss-field-group">
            <label htmlFor="username" className="bss-label">
              User ID / Username
            </label>
            <div className="bss-input-wrap">
              <span className="material-symbols-outlined bss-input-icon">person</span>
              <input
                id="username"
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. peculiex"
                className="bss-input"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="bss-field-group">
            <label htmlFor="password" className="bss-label">
              Password
            </label>
            <div className="bss-input-wrap">
              <span className="material-symbols-outlined bss-input-icon">key</span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="bss-input bss-input-pass"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="bss-toggle-btn"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" disabled={loading} className="bss-submit-btn">
            {loading ? (
              <>
                <div className="bss-spinner" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <span>Enter Website</span>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  arrow_forward
                </span>
              </>
            )}
          </button>
        </form>

        {/* Footer Security Badges */}
        <div className="bss-card-footer">
          <div className="bss-footer-item">
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#059669' }}>
              verified_user
            </span>
            <span>Secure Access Control</span>
          </div>
          <span className="bss-footer-version">Bheral Systems v1.0</span>
        </div>
      </div>

      <style jsx global>{`
        .bss-login-wrapper {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(145deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%);
          padding: 24px 16px;
          position: relative;
          overflow-x: hidden;
          font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
          box-sizing: border-box;
        }

        .bss-login-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          opacity: 0.6;
        }

        .bss-login-glow-1 {
          top: 10%;
          left: 50%;
          transform: translateX(-50%);
          width: 500px;
          height: 300px;
          background: radial-gradient(circle, rgba(2, 132, 199, 0.12) 0%, rgba(99, 102, 241, 0.06) 60%, transparent 80%);
        }

        .bss-login-glow-2 {
          bottom: 5%;
          right: 15%;
          width: 350px;
          height: 250px;
          background: radial-gradient(circle, rgba(14, 165, 233, 0.08) 0%, transparent 70%);
        }

        .bss-login-card {
          position: relative;
          width: 100%;
          max-width: 440px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 40px 32px;
          box-shadow: 
            0 10px 25px -5px rgba(0, 0, 0, 0.05),
            0 20px 40px -15px rgba(15, 23, 42, 0.08),
            0 0 0 1px rgba(0, 0, 0, 0.02);
          color: #0f172a;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box;
          z-index: 10;
        }

        .bss-brand-header {
          text-align: center;
          margin-bottom: 28px;
        }

        .bss-icon-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 60px;
          height: 60px;
          border-radius: 18px;
          background: linear-gradient(135deg, #e0f2fe 0%, #eff6ff 100%);
          border: 1px solid #bae6fd;
          margin-bottom: 16px;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.1);
        }

        .bss-lock-icon {
          font-size: 30px;
          color: #0284c7;
        }

        .bss-pill-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 999px;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #0284c7;
          margin-bottom: 12px;
        }

        .bss-pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #0284c7;
          box-shadow: 0 0 6px #0284c7;
        }

        .bss-title {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #0f172a;
          margin: 0 0 6px 0;
          line-height: 1.25;
        }

        .bss-subtitle {
          font-size: 13px;
          color: #64748b;
          margin: 0;
          line-height: 1.5;
        }

        .bss-error-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 20px;
          line-height: 1.4;
          box-sizing: border-box;
        }

        .bss-error-icon {
          font-size: 20px;
          color: #ef4444;
          flex-shrink: 0;
        }

        .bss-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .bss-field-group {
          display: flex;
          flex-direction: column;
        }

        .bss-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          margin-bottom: 7px;
        }

        .bss-input-wrap {
          position: relative;
          width: 100%;
        }

        .bss-input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 20px;
          color: #94a3b8;
          pointer-events: none;
        }

        .bss-input {
          width: 100%;
          height: 48px;
          padding-left: 44px;
          padding-right: 14px;
          border-radius: 12px;
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          color: #0f172a;
          font-size: 15px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
          font-family: inherit;
        }

        .bss-input::placeholder {
          color: #94a3b8;
        }

        .bss-input:focus {
          border-color: #0284c7;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
        }

        .bss-input-pass {
          padding-right: 44px;
        }

        .bss-toggle-btn {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: color 0.15s;
        }

        .bss-toggle-btn:hover {
          color: #334155;
        }

        .bss-submit-btn {
          margin-top: 6px;
          height: 50px;
          width: 100%;
          border-radius: 12px;
          background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
          border: none;
          color: #ffffff;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
          transition: all 0.2s ease;
          box-sizing: border-box;
          font-family: inherit;
        }

        .bss-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
        }

        .bss-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .bss-submit-btn:disabled {
          opacity: 0.75;
          cursor: not-allowed;
        }

        .bss-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: bss-spin 0.8s linear infinite;
        }

        .bss-card-footer {
          margin-top: 28px;
          padding-top: 18px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          color: #64748b;
        }

        .bss-footer-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .bss-footer-version {
          font-size: 11px;
          color: #94a3b8;
        }

        /* Mobile specific responsiveness */
        @media (max-width: 640px) {
          .bss-login-wrapper {
            padding: 16px 12px;
            align-items: center;
          }

          .bss-login-card {
            padding: 28px 20px;
            border-radius: 16px;
            box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.06);
          }

          .bss-icon-badge {
            width: 52px;
            height: 52px;
            border-radius: 14px;
            margin-bottom: 12px;
          }

          .bss-lock-icon {
            font-size: 26px;
          }

          .bss-title {
            font-size: 19px;
          }

          .bss-subtitle {
            font-size: 12px;
          }

          .bss-input {
            height: 46px;
            font-size: 16px; /* Prevents auto-zoom in iOS Safari */
          }

          .bss-submit-btn {
            height: 48px;
            font-size: 15px;
          }

          .bss-card-footer {
            flex-direction: column;
            gap: 8px;
            text-align: center;
          }
        }

        @media (max-width: 360px) {
          .bss-login-card {
            padding: 22px 16px;
          }
          .bss-title {
            font-size: 18px;
          }
        }

        @keyframes bss-shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-7px); }
          40%, 80% { transform: translateX(7px); }
        }

        @keyframes bss-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            color: '#64748b',
            fontFamily: 'sans-serif',
          }}
        >
          Loading portal gateway...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
