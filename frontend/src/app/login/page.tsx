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
    <div className="bss-login-wrapper" suppressHydrationWarning>
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
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. peculiex"
                className="bss-input"
                suppressHydrationWarning
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
                suppressHydrationWarning
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
            background: '#f8fafc',
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
