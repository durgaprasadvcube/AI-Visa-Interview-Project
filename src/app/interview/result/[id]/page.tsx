'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface AnswerRecord {
    question: string;
    transcript: string;
    score?: number;
    feedback?: {
        score: number;
        strengths: string[];
        weaknesses: string[];
        suggestions: string[];
        summary: string;
    };
}

interface AlertRecord {
    type: string;
    time: string;
}

function getReadinessLabel(avg: number): { label: string; color: string; emoji: string } {
    if (avg >= 8) return { label: 'Excellent — Highly Ready', color: 'text-accent-400', emoji: '🏆' };
    if (avg >= 6) return { label: 'Good — Mostly Ready', color: 'text-primary-400', emoji: '✅' };
    if (avg >= 4) return { label: 'Fair — Needs Practice', color: 'text-warning-400', emoji: '📖' };
    return { label: 'Needs Improvement', color: 'text-danger-400', emoji: '💪' };
}

function getScoreClass(score?: number) {
    if (!score) return 'score-medium';
    if (score >= 7) return 'score-high';
    if (score >= 4) return 'score-medium';
    return 'score-low';
}

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useState, useRef } from 'react';

function ResultContent() {
    const searchParams = useSearchParams();
    const params = useParams();
    const interviewId = params.id as string;
    const reportRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    let answers: AnswerRecord[] = [];
    let alerts: AlertRecord[] = [];

    try {
        const answersParam = searchParams.get('answers');
        const alertsParam = searchParams.get('alerts');
        if (answersParam) answers = JSON.parse(decodeURIComponent(answersParam));
        if (alertsParam) alerts = JSON.parse(decodeURIComponent(alertsParam));
    } catch { }

    const scores = answers.filter((a) => a.score != null).map((a) => a.score as number);
    const avgScore = scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : 0;
    const readiness = getReadinessLabel(avgScore);
    const totalAnswered = answers.length;
    const alertCount = alerts.length;
    const confidenceScore = Math.max(0, Math.min(100, Math.round((avgScore / 10) * 100 - alertCount * 5)));

    const downloadPDF = async () => {
        if (!reportRef.current) return;
        setIsDownloading(true);

        try {
            // Lower scale for faster, slightly lower res PDF to avoid massive file sizes
            const canvas = await html2canvas(reportRef.current, { scale: 1.5, useCORS: true });
            const imgData = canvas.toDataURL('image/png');

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            // If the report is taller than one A4 page, we let it scale down to fit one page width
            // For multi-page you'd slice it, but for a summary report, scaling it is usually acceptable
            pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
            pdf.save(`Visa-Interview-Report-${interviewId !== 'demo' ? interviewId.slice(0, 6) : 'demo'}.pdf`);
        } catch (error) {
            console.error('Failed to generate PDF', error);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="min-h-screen py-10 px-4">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* PDF Wrapper - this div and everything inside is captured */}
                <div ref={reportRef} className="space-y-8 bg-surface-900 p-8 rounded-3xl pb-16">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center"
                    >
                        <div className="text-6xl mb-4">{readiness.emoji}</div>
                        <h1 className="text-4xl font-extrabold text-white mb-2">Interview Report</h1>
                        <p className="text-slate-400 text-lg">
                            {interviewId !== 'demo' ? `Session ID: ${interviewId.slice(0, 8)}...` : 'Demo Session'}
                        </p>
                    </motion.div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: 'Questions', value: totalAnswered, sub: 'answered', color: 'text-white' },
                            { label: 'Average Score', value: `${avgScore}/10`, sub: 'out of 10', color: avgScore >= 7 ? 'text-accent-400' : avgScore >= 4 ? 'text-warning-400' : 'text-danger-400' },
                            { label: 'Confidence', value: `${confidenceScore}%`, sub: 'estimated', color: 'text-primary-300' },
                            { label: 'Alerts', value: alertCount, sub: 'events logged', color: alertCount > 0 ? 'text-warning-400' : 'text-accent-400' },
                        ].map((card) => (
                            <motion.div
                                key={card.label}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="glass rounded-2xl p-5 text-center"
                            >
                                <div className={`text-3xl font-black mb-1 ${card.color}`}>{card.value}</div>
                                <div className="text-xs text-slate-500 uppercase tracking-wide">{card.label}</div>
                                <div className="text-xs text-slate-600 mt-0.5">{card.sub}</div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Readiness Banner */}
                    <div className="glass rounded-2xl p-6 flex items-center gap-5">
                        <div className="text-4xl">{readiness.emoji}</div>
                        <div className="flex-1">
                            <div className="text-lg font-bold text-white mb-1">Interview Readiness</div>
                            <div className={`text-xl font-black ${readiness.color}`}>{readiness.label}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-4xl font-black text-white">{avgScore}</div>
                            <div className="text-xs text-slate-500">/ 10</div>
                        </div>
                    </div>

                    {/* Per-Question Breakdown */}
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-5">📋 Per-Question Breakdown</h2>
                        <div className="space-y-4">
                            {answers.map((answer, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.08 }}
                                    className="glass rounded-2xl p-6"
                                >
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div className="flex-1">
                                            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                                                Question {i + 1}
                                            </div>
                                            <h3 className="text-white font-semibold leading-tight">
                                                {answer.question}
                                            </h3>
                                        </div>
                                        <div className={`score-badge flex-shrink-0 ${getScoreClass(answer.score)}`}>
                                            {answer.score ?? '?'}
                                        </div>
                                    </div>

                                    {/* Transcript */}
                                    {answer.transcript && (
                                        <div className="mb-4">
                                            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Your Answer</div>
                                            <div className="bg-surface-800 rounded-xl px-4 py-3 text-slate-300 text-sm leading-relaxed">
                                                "{answer.transcript || 'No transcript recorded'}"
                                            </div>
                                        </div>
                                    )}

                                    {/* AI Feedback */}
                                    {answer.feedback && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {/* Strengths */}
                                            {answer.feedback.strengths?.length > 0 && (
                                                <div>
                                                    <div className="text-xs font-semibold text-accent-400 mb-2 flex items-center gap-1">
                                                        <span>✓</span> Strengths
                                                    </div>
                                                    <ul className="space-y-1">
                                                        {answer.feedback.strengths.map((s, j) => (
                                                            <li key={j} className="text-xs text-slate-400 flex items-start gap-1.5">
                                                                <span className="text-accent-500 mt-0.5">•</span>{s}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {/* Weaknesses */}
                                            {answer.feedback.weaknesses?.length > 0 && (
                                                <div>
                                                    <div className="text-xs font-semibold text-danger-400 mb-2 flex items-center gap-1">
                                                        <span>✗</span> Weaknesses
                                                    </div>
                                                    <ul className="space-y-1">
                                                        {answer.feedback.weaknesses.map((w, j) => (
                                                            <li key={j} className="text-xs text-slate-400 flex items-start gap-1.5">
                                                                <span className="text-danger-500 mt-0.5">•</span>{w}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {/* Suggestions */}
                                            {answer.feedback.suggestions?.length > 0 && (
                                                <div>
                                                    <div className="text-xs font-semibold text-primary-300 mb-2 flex items-center gap-1">
                                                        <span>💡</span> Suggestions
                                                    </div>
                                                    <ul className="space-y-1">
                                                        {answer.feedback.suggestions.map((s, j) => (
                                                            <li key={j} className="text-xs text-slate-400 flex items-start gap-1.5">
                                                                <span className="text-primary-400 mt-0.5">•</span>{s}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {answer.feedback?.summary && (
                                        <div className="mt-3 pt-3 border-t border-surface-600 text-xs text-slate-500 italic">
                                            {answer.feedback.summary}
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Alerts Timeline */}
                    {alerts.length > 0 && (
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-5">⚠️ Alert Events</h2>
                            <div className="glass rounded-2xl p-6">
                                <div className="space-y-3">
                                    {alerts.map((alert, i) => (
                                        <div key={i} className="flex items-center gap-4 text-sm">
                                            <span className="text-warning-400">⚠️</span>
                                            <div className="flex-1 text-slate-300 capitalize">
                                                {alert.type.replace(/_/g, ' ')}
                                            </div>
                                            <div className="text-slate-500 text-xs">
                                                {new Date(alert.time).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 pb-8">
                    <button
                        onClick={downloadPDF}
                        disabled={isDownloading}
                        className="bg-accent-600 hover:bg-accent-500 text-white font-semibold py-3 px-8 rounded-xl text-center transition-colors disabled:opacity-50"
                    >
                        {isDownloading ? '⏳ Generating PDF...' : '📥 Download Report'}
                    </button>
                    <Link
                        href="/interview/start"
                        className="btn-primary py-3 px-8 rounded-xl text-center"
                        id="result-practice-again-btn"
                    >
                        🔄 Practice Again
                    </Link>
                    <Link
                        href="/"
                        className="btn-secondary py-3 px-8 rounded-xl text-center"
                        id="result-home-btn"
                    >
                        🏠 Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function ResultPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Loading your report...</p>
                </div>
            </div>
        }>
            <ResultContent />
        </Suspense>
    );
}
