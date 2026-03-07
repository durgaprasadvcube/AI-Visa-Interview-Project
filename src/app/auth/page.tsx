'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

export default function AuthPage() {
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [supabase, setSupabase] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        try { setSupabase(createClient()); } catch (e) { }
    }, []);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            if (!supabase) {
                throw new Error("Supabase is not configured! Please add your keys to .env.local and RESTART the Next.js server.");
            }

            if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setSuccess('Account created! Check your email to confirm, or login directly.');
                setMode('login');
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                router.push('/interview/start');
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Authentication failed';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 relative">
            {/* Background Effects */}
            <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-primary-600/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-3xl mx-auto mb-4">
                        🎓
                    </div>
                    <h1 className="text-3xl font-bold text-white">VisaPrep AI</h1>
                    <p className="text-slate-400 mt-2 text-sm">AI-powered visa interview simulator</p>
                </div>

                {/* Card */}
                <div className="glass rounded-2xl p-8">
                    {/* Tab Switcher */}
                    <div className="flex bg-surface-800 rounded-xl p-1 mb-8">
                        {(['login', 'signup'] as const).map((tab) => (
                            <button
                                key={tab}
                                id={`auth-tab-${tab}`}
                                onClick={() => { setMode(tab); setError(''); setSuccess(''); }}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === tab
                                    ? 'bg-primary-600 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                {tab === 'login' ? 'Sign In' : 'Sign Up'}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleAuth} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Email Address
                            </label>
                            <input
                                id="auth-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                required
                                className="w-full px-4 py-3 rounded-xl bg-surface-700 border border-surface-600 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Password
                            </label>
                            <input
                                id="auth-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                                className="w-full px-4 py-3 rounded-xl bg-surface-700 border border-surface-600 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                            />
                        </div>

                        {/* Error / Success messages */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="alert-danger text-sm"
                                    id="auth-error"
                                >
                                    {error}
                                </motion.div>
                            )}
                            {success && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="alert-success text-sm"
                                    id="auth-success"
                                >
                                    {success}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            id="auth-submit-btn"
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary py-3 rounded-xl relative"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                                </span>
                            ) : (
                                mode === 'login' ? 'Sign In' : 'Create Account'
                            )}
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-500 mt-6">
                        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                        <button
                            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
                            className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
                            id="auth-mode-toggle"
                        >
                            {mode === 'login' ? 'Sign up free' : 'Sign in'}
                        </button>
                    </p>
                </div>

                <p className="text-center text-xs text-slate-600 mt-6">
                    By continuing, you agree to our terms of service.
                </p>
            </motion.div>
        </div>
    );
}
