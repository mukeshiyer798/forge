import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, mapBackendUserToUser } from '@/store/useAppStore';
import { login as apiLogin, signup as apiSignup, testToken, setupTokenRefresh } from '@/lib/api';
import { setAccessToken } from '@/lib/auth';

type Tab = 'login' | 'signup';

function getDetailMessage(detail: string | Record<string, unknown>): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(', ');
  return (detail as { msg?: string }).msg || JSON.stringify(detail);
}

export default function AuthPage() {
  const [tab, setTab] = useState<Tab>('login');
  const { login } = useAppStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    nudge: 'daily' as 'daily' | 'weekly' | 'off',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const email = loginForm.email.trim();
    const password = loginForm.password;
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    setLoading(true);
    try {
      const tokenRes = await apiLogin(email, password);
      setAccessToken(tokenRes.access_token);
      const userRes = await testToken();
      login(mapBackendUserToUser(userRes));
      // Fetch user's goals from backend (RBAC-scoped)
      useAppStore.getState().fetchGoalsFromBackend();
      useAppStore.getState().fetchReadingInsightsFromBackend();
      // Start auto token refresh
      setupTokenRefresh((newToken) => setAccessToken(newToken));
    } catch (err: unknown) {
      const apiErr = err as { detail?: string | Record<string, unknown> };
      setError(apiErr.detail ? getDetailMessage(apiErr.detail) : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const name = signupForm.name.trim() || signupForm.email.split('@')[0] || 'User';
    const email = signupForm.email.trim();
    const password = signupForm.password;
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await apiSignup({ email, password, full_name: name, nudge_preference: signupForm.nudge });
      const tokenRes = await apiLogin(email, password);
      setAccessToken(tokenRes.access_token);
      const userRes = await testToken();
      login(mapBackendUserToUser(userRes));
      // Fetch goals (will be empty for new users — RBAC enforced)
      useAppStore.getState().fetchGoalsFromBackend();
      useAppStore.getState().fetchReadingInsightsFromBackend();
      // Start auto token refresh
      setupTokenRefresh((newToken) => setAccessToken(newToken));
    } catch (err: unknown) {
      const apiErr = err as { detail?: string | Record<string, unknown> };
      setError(apiErr.detail ? getDetailMessage(apiErr.detail) : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-forge-bg flex items-center justify-center relative overflow-hidden">
      {/* Background noise */}
      <div className="noise-overlay absolute inset-0 opacity-[0.03] pointer-events-none" />

      {/* Massive bg text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <span
          className="font-display text-[clamp(120px,25vw,320px)] text-forge-text/[0.025] tracking-widest whitespace-nowrap select-none"
          style={{ letterSpacing: '0.1em' }}
        >
          DISCIPLINE
        </span>
      </div>

      {/* Amber gradient accent */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-amber-500/5 blur-[80px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-[460px] max-w-[92vw]"
      >
        <div className="forge-card">
          <div className="amber-bar" />
          <div className="p-10">
            {/* Logo */}
            <div className="mb-8">
              <h1 className="font-display text-5xl tracking-widest text-forge-text">
                FORGE<span className="text-forge-amber">.</span>
              </h1>
              <p className="font-mono text-sm uppercase tracking-[0.2em] text-forge-dim mt-1">
                // Build the person you need to be
              </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-forge-border mb-8">
              {(['login', 'signup'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`font-condensed font-bold text-base tracking-widest uppercase px-5 py-3 border-b-2 -mb-px transition-all duration-200 ${tab === t
                    ? 'text-forge-amber border-forge-amber'
                    : 'text-forge-dim border-transparent hover:text-forge-text'
                    }`}
                >
                  {t === 'login' ? 'Login' : 'Sign Up'}
                </button>
              ))}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
            <AnimatePresence mode="wait">
              {tab === 'login' ? (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleLogin}
                  className="flex flex-col gap-4"
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="forge-label">Email</label>
                    <input
                      type="email"
                      className="forge-input"
                      placeholder="you@domain.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="forge-label">Password</label>
                    <input
                      type="password"
                      className="forge-input"
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="forge-btn-primary mt-2" disabled={loading}>
                    {loading ? 'Signing in...' : 'Enter the Forge →'}
                  </button>
                </motion.form>
              ) : (
                <motion.form
                  key="signup"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSignup}
                  className="flex flex-col gap-4"
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="forge-label">Full Name</label>
                    <input
                      type="text"
                      className="forge-input"
                      placeholder="Your full name"
                      value={signupForm.name}
                      onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="forge-label">Email</label>
                    <input
                      type="email"
                      className="forge-input"
                      placeholder="you@domain.com"
                      value={signupForm.email}
                      onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="forge-label">Password</label>
                    <input
                      type="password"
                      className="forge-input"
                      placeholder="Make it strong"
                      value={signupForm.password}
                      onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    />
                    {/* Password Strength Indicator */}
                    {signupForm.password.length > 0 && (() => {
                      const pw = signupForm.password;
                      const checks = {
                        length: pw.length >= 8,
                        upper: /[A-Z]/.test(pw),
                        lower: /[a-z]/.test(pw),
                        number: /[0-9]/.test(pw),
                        special: /[^A-Za-z0-9]/.test(pw),
                      };
                      const score = Object.values(checks).filter(Boolean).length;
                      const label = score <= 1 ? 'Weak' : score <= 2 ? 'Fair' : score <= 3 ? 'Good' : score <= 4 ? 'Strong' : 'Very Strong';
                      const color = score <= 1 ? 'bg-red-500' : score <= 2 ? 'bg-amber-500' : score <= 3 ? 'bg-amber-400' : 'bg-green-400';
                      const textColor = score <= 1 ? 'text-red-400' : score <= 2 ? 'text-amber-500' : score <= 3 ? 'text-amber-400' : 'text-green-400';
                      return (
                        <div className="mt-2 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1 flex-1">
                              {[1, 2, 3, 4].map((i) => (
                                <div
                                  key={i}
                                  className={`h-1 flex-1 transition-colors duration-200 ${i <= Math.min(score, 4) ? color : 'bg-forge-surface2'}`}
                                />
                              ))}
                            </div>
                            <span className={`font-mono text-[13px] uppercase tracking-wider ${textColor}`}>{label}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                            {([
                              [checks.length, '8+ chars'],
                              [checks.upper, 'A-Z'],
                              [checks.lower, 'a-z'],
                              [checks.number, '0-9'],
                              [checks.special, '!@#$'],
                            ] as [boolean, string][]).map(([met, lbl]) => (
                              <span
                                key={lbl}
                                className={`font-mono text-[8px] uppercase tracking-wider transition-colors ${met ? 'text-green-400' : 'text-forge-muted'}`}
                              >
                                {met ? '✓' : '○'} {lbl}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="forge-label">Confirm Password</label>
                    <input
                      type="password"
                      className="forge-input"
                      placeholder="Retype your password"
                      value={signupForm.confirmPassword}
                      onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                    />
                    {signupForm.confirmPassword.length > 0 && signupForm.password !== signupForm.confirmPassword && (
                      <p className="font-mono text-xs text-red-400 mt-1">Passwords do not match</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="forge-label">Nudge Emails</label>
                    <select
                      className="forge-input"
                      value={signupForm.nudge}
                      onChange={(e) =>
                        setSignupForm({ ...signupForm, nudge: e.target.value as 'daily' | 'weekly' | 'off' })
                      }
                    >
                      <option value="daily">Daily (Stay accountable)</option>
                      <option value="weekly">Weekly check-in</option>
                      <option value="off">Off (No emails)</option>
                    </select>
                    <p className="font-mono text-[13px] text-forge-muted mt-1">
                      You can change this later in Settings.
                    </p>
                  </div>
                  <button type="submit" className="forge-btn-primary mt-2" disabled={loading}>
                    {loading ? 'Creating account...' : 'Start Forging →'}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>

        <p className="text-center font-mono text-sm text-forge-muted mt-6 tracking-widest uppercase">
          No excuses. No shortcuts. Just work.
        </p>
      </motion.div>
    </div>
  );
}
