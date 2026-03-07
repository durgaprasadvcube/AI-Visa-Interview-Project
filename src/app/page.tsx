'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';

const features = [
    {
        icon: '🎤',
        title: 'Live Speech Recognition',
        description: 'Real-time voice-to-text transcript as you answer each question.',
    },
    {
        icon: '🤖',
        title: 'AI-Powered Evaluation',
        description: 'Gemini AI evaluates clarity, relevance, grammar, and interview quality.',
    },
    {
        icon: '📷',
        title: 'Face Monitoring',
        description: 'Webcam monitors for multiple faces or leaving the frame — just like a real interview.',
    },
    {
        icon: '⏱️',
        title: 'Timed Questions',
        description: 'Auto-advancing timer for each question, simulating real interview pressure.',
    },
    {
        icon: '📊',
        title: 'Detailed Report',
        description: 'Full performance report with per-question scores, feedback, and improvement tips.',
    },
    {
        icon: '🔒',
        title: 'Private & Secure',
        description: 'Only transcripts and scores stored — no video data. Your sessions stay private.',
    },
];

const steps = [
    { step: '01', title: 'Grant Permissions', desc: 'Allow camera and microphone access' },
    { step: '02', title: 'Answer Questions', desc: 'Speak your answers to 10 visa questions' },
    { step: '03', title: 'AI Evaluates', desc: 'Get instant scoring and feedback' },
    { step: '04', title: 'Review Report', desc: 'See your readiness score and tips' },
];

export default function LandingPage() {
    const [email, setEmail] = useState('');

    return (
        <div className="min-h-screen">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 glass-dark border-b border-primary-800/30">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-lg">
                            🎓
                        </div>
                        <span className="font-bold text-lg text-white">VisaPrep AI</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/auth" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                            Sign In
                        </Link>
                        <Link href="/auth" className="btn-primary text-sm py-2 px-5 rounded-lg inline-block">
                            Get Started Free
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6 relative overflow-hidden">
                {/* Background glow effects */}
                <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute top-40 right-1/4 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="max-w-5xl mx-auto text-center relative">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary-500/30 text-primary-300 text-sm font-medium mb-8">
                            <span className="w-2 h-2 rounded-full bg-accent-400 animate-pulse-slow" />
                            AI-Powered Visa Interview Practice
                        </div>

                        <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight mb-6">
                            Ace Your{' '}
                            <span className="gradient-text">Visa Interview</span>{' '}
                            with AI
                        </h1>

                        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                            Practice real visa interview questions with live speech recognition,
                            AI feedback, and face monitoring — exactly like the real thing.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <Link
                                href="/auth"
                                className="btn-primary text-lg px-10 py-4 rounded-xl inline-flex items-center gap-2"
                                id="hero-cta-start"
                            >
                                Start Free Practice
                                <span>→</span>
                            </Link>
                            <Link
                                href="#how-it-works"
                                className="btn-secondary text-lg px-10 py-4 rounded-xl inline-flex items-center gap-2"
                                id="hero-cta-learn"
                            >
                                How It Works
                            </Link>
                        </div>

                        {/* Stats */}
                        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
                            {[
                                { icon: '📝', value: '50+', label: 'Real Visa Questions' },
                                { icon: '🤖', value: 'Gemini AI', label: 'Evaluation Engine' },
                                { icon: '✨', value: '100%', label: 'Free to Practice' },
                            ].map((stat, i) => (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.2 + (i * 0.1) }}
                                    className="glass rounded-2xl p-6 text-center border border-primary-500/20 shadow-xl shadow-primary-900/10 hover:-translate-y-1 hover:border-primary-500/40 hover:bg-surface-800/80 transition-all duration-300 relative overflow-hidden group"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-accent-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                    <div className="text-2xl mb-2 drop-shadow-md">{stat.icon}</div>
                                    <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-400 tracking-tight">{stat.value}</div>
                                    <div className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-wide">{stat.label}</div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 px-6" id="features">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-white mb-4">
                            Everything You Need to <span className="gradient-text">Succeed</span>
                        </h2>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                            A complete interview simulation platform designed for international students.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, i) => (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="glass rounded-2xl p-6 card-hover"
                            >
                                <div className="text-4xl mb-4">{feature.icon}</div>
                                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-20 px-6 relative" id="how-it-works">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary-950/30 to-transparent pointer-events-none" />
                <div className="max-w-5xl mx-auto relative">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-white mb-4">
                            How It <span className="gradient-text">Works</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {steps.map((step, i) => (
                            <motion.div
                                key={step.step}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.15 }}
                                className="text-center relative"
                            >
                                {i < steps.length - 1 && (
                                    <div className="hidden md:block absolute top-8 left-[60%] w-full h-px bg-gradient-to-r from-primary-600/40 to-transparent" />
                                )}
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center text-2xl font-black text-primary-200 mx-auto mb-4 glow-primary">
                                    {step.step}
                                </div>
                                <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                                <p className="text-slate-400 text-sm">{step.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Banner */}
            <section className="py-20 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="glass rounded-3xl p-10 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-accent-500 to-primary-500" />
                        <h2 className="text-4xl font-bold text-white mb-4">
                            Ready to practice?
                        </h2>
                        <p className="text-slate-400 mb-8 text-lg">
                            Create a free account and start your first simulated visa interview in under a minute.
                        </p>
                        <Link
                            href="/auth"
                            className="btn-primary text-lg px-12 py-4 rounded-xl inline-flex items-center gap-2"
                            id="bottom-cta-start"
                        >
                            Start Interview Now
                            <span>🎓</span>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-6 border-t border-surface-700">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <span>🎓</span>
                        <span>VisaPrep AI — Built for students, by AI</span>
                    </div>
                    <div className="text-slate-500 text-sm">
                        © 2026 VisaPrep AI. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
