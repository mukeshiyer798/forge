import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';

type Tab = 'login' | 'signup';

export default function AuthPage() {
    const [tab, setTab] = useState<Tab>('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { login, signup } = useAppStore();

    // Login Form State
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Signup Form State
    const [signupName, setSignupName] = useState('');
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword, setSignupPassword] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await login({ username: loginEmail, password: loginPassword });
        } catch (err: any) {
            setError(err?.detail || 'Authentication failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await signup({ name: signupName, email: signupEmail, password: signupPassword });
        } catch (err: any) {
            setError(err?.detail || 'Registration failed. Please check your details.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-forge-bg flex items-center justify-center relative overflow-hidden selection:bg-forge-amber selection:text-forge-bg">
            {/* Background noise */}
            <div className="noise-overlay absolute inset-0 opacity-[0.03] pointer-events-none" />

            {/* Massive bg text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                <span
                    className="font-display text-[clamp(120px,25vw,320px)] text-white/[0.025] tracking-widest whitespace-nowrap select-none"
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
                <div className="forge-card border-none shadow-2xl">
                    <div className="amber-bar" />
                    <div className="p-10">
                        {/* Logo */}
                        <div className="mb-8 text-left">
                            <h1 className="font-display text-5xl tracking-widest text-white">
                                FORGE<span className="text-forge-amber">.</span>
                            </h1>
                            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-forge-dim mt-1">
                                // Build the person you need to be
                            </p>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-forge-border mb-8">
                            {(['login', 'signup'] as Tab[]).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => { setTab(t); setError(null); }}
                                    className={`font-condensed font-bold text-sm tracking-widest uppercase px-5 py-3 border-b-2 -mb-px transition-all duration-200 ${tab === t
                                        ? 'text-forge-amber border-forge-amber'
                                        : 'text-forge-dim border-transparent hover:text-white'
                                        }`}
                                >
                                    {t === 'login' ? 'Login' : 'Sign Up'}
                                </button>
                            ))}
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mb-6 bg-red-500/10 border border-red-500/20 p-4 text-red-500 font-mono text-[11px] uppercase tracking-wider text-center"
                            >
                                {error}
                            </motion.div>
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
                                    className="flex flex-col gap-5"
                                >
                                    <div className="flex flex-col gap-1.5">
                                        <label className="forge-label">Email</label>
                                        <input
                                            type="email"
                                            required
                                            className="forge-input"
                                            placeholder="you@domain.com"
                                            value={loginEmail}
                                            onChange={(e) => setLoginEmail(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="forge-label">Password</label>
                                        <input
                                            type="password"
                                            required
                                            className="forge-input"
                                            placeholder="••••••••"
                                            value={loginPassword}
                                            onChange={(e) => setLoginPassword(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="forge-btn-primary mt-4 flex items-center justify-center gap-2 group"
                                    >
                                        {loading ? 'Entering...' : 'Enter the Forge →'}
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
                                    className="flex flex-col gap-5"
                                >
                                    <div className="flex flex-col gap-1.5">
                                        <label className="forge-label">Full Name</label>
                                        <input
                                            type="text"
                                            required
                                            className="forge-input"
                                            placeholder="John Doe"
                                            value={signupName}
                                            onChange={(e) => setSignupName(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="forge-label">Email</label>
                                        <input
                                            type="email"
                                            required
                                            className="forge-input"
                                            placeholder="you@domain.com"
                                            value={signupEmail}
                                            onChange={(e) => setSignupEmail(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="forge-label">Password</label>
                                        <input
                                            type="password"
                                            required
                                            className="forge-input"
                                            placeholder="Make it strong"
                                            value={signupPassword}
                                            onChange={(e) => setSignupPassword(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="forge-btn-primary mt-4 flex items-center justify-center gap-2 group"
                                    >
                                        {loading ? 'Forging...' : 'Start Forging →'}
                                    </button>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <p className="text-center font-mono text-[10px] text-forge-dim/40 mt-8 tracking-[0.3em] uppercase">
                    No excuses. No shortcuts. Just work.
                </p>
            </motion.div>
        </div>
    );
}
