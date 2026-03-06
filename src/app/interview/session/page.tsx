'use client';

export const dynamic = 'force-dynamic';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { SAMPLE_VISA_QUESTIONS, VisaQuestion } from '@/data/sample-questions';
import WebcamMonitor from '@/components/WebcamMonitor';
import SpeechCapture from '@/components/SpeechCapture';
import QuestionTimer from '@/components/QuestionTimer';
import AlertBanner from '@/components/AlertBanner';

interface AlertEvent {
    type: string;
    time: Date;
}

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

function InterviewSessionContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const interviewId = searchParams.get('id');
    const isDemo = searchParams.get('demo') === 'true';

    const [questions, setQuestions] = useState<VisaQuestion[]>(SAMPLE_VISA_QUESTIONS);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [transcript, setTranscript] = useState('');
    const [accumulatedTranscript, setAccumulatedTranscript] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [alertEvents, setAlertEvents] = useState<AlertEvent[]>([]);
    const [answers, setAnswers] = useState<AnswerRecord[]>([]);
    const [sessionComplete, setSessionComplete] = useState(false);
    const [phase, setPhase] = useState<'reading' | 'answering' | 'evaluating'>('reading');
    const [spokenText, setSpokenText] = useState('');
    const [questionKey, setQuestionKey] = useState(0);
    const transcriptRef = useRef('');
    const processingRef = useRef(false);

    const currentQuestion = questions[currentIdx];
    const totalQuestions = questions.length;

    // Load questions from API
    useEffect(() => {
        const queryParams = new URLSearchParams();
        if (interviewId) queryParams.append('interview_id', interviewId);
        if (isDemo) queryParams.append('is_demo', 'true');

        fetch(`/api/questions?${queryParams.toString()}`)
            .then((r) => r.json())
            .then((d) => { if (d.questions?.length > 0) setQuestions(d.questions); })
            .catch(() => { }); // use defaults on error
    }, [interviewId, isDemo]);

    // Log alert to Supabase
    const logAlert = useCallback(async (type: string) => {
        setAlertEvents((prev) => [...prev, { type, time: new Date() }]);
        if (interviewId && !isDemo) {
            try {
                await fetch('/api/alerts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ interview_id: interviewId, alert_type: type }),
                });
            } catch { }
        }
    }, [interviewId, isDemo]);

    const handleFaceAlert = useCallback((type: 'multiple_faces' | 'no_face' | 'left_frame' | 'eye_movement') => {
        const messages = {
            multiple_faces: '⚠️ Multiple people detected. This will be flagged.',
            no_face: '⚠️ Face not detected. Please stay in frame.',
            left_frame: '⚠️ You left the camera frame.',
            eye_movement: '⚠️ Please look directly at the camera.',
        };
        setAlertMessage(messages[type]);
        logAlert(type);
    }, [logAlert]);

    const handleTranscriptUpdate = useCallback((text: string, isFinal: boolean) => {
        if (isFinal) {
            setAccumulatedTranscript((prev) => {
                const updated = prev ? `${prev} ${text}` : text;
                transcriptRef.current = updated;
                return updated;
            });
            setTranscript('');
        } else {
            setTranscript(text);
        }
    }, []);

    const evaluateAndAdvance = useCallback(async () => {
        if (processingRef.current) return;
        processingRef.current = true;
        setPhase('evaluating');

        const finalTranscript = transcriptRef.current.trim();
        const question = questions[currentIdx];

        // Call AI evaluation
        let evaluation = null;
        try {
            const res = await fetch('/api/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: question.question, transcript: finalTranscript }),
            });
            evaluation = await res.json();
        } catch { }

        // Save answer
        const answerData: AnswerRecord = {
            question: question.question,
            transcript: finalTranscript,
            score: evaluation?.score,
            feedback: evaluation,
        };
        setAnswers((prev) => [...prev, answerData]);

        // Persist to Supabase
        if (interviewId && !isDemo) {
            try {
                await fetch('/api/answers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        interview_id: interviewId,
                        question: question.question,
                        transcript: finalTranscript,
                        ai_score: evaluation?.score,
                        feedback: evaluation,
                    }),
                });
            } catch { }
        }

        // Move to next question or finish
        const nextIdx = currentIdx + 1;
        if (nextIdx >= totalQuestions) {
            // Finalize interview
            if (interviewId && !isDemo && answers.length > 0) {
                const scores = [...answers, answerData]
                    .filter((a) => a.score != null)
                    .map((a) => a.score as number);
                const avgScore = scores.length > 0
                    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                    : 5;

                try {
                    await fetch('/api/interviews', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ interview_id: interviewId, final_score: avgScore }),
                    });
                } catch { }
            }
            setSessionComplete(true);
        } else {
            setCurrentIdx(nextIdx);
            setTranscript('');
            setAccumulatedTranscript('');
            transcriptRef.current = '';
            setSpokenText('');
            setQuestionKey((k) => k + 1);
            setPhase('reading');
        }

        processingRef.current = false;
    }, [currentIdx, questions, totalQuestions, interviewId, isDemo, answers]);

    // Track Silence / Auto-Skip (15 seconds)
    useEffect(() => {
        if (phase !== 'answering' || sessionComplete) return;

        // If in "answering" phase, start a timeout to auto-advance if no new transcript arrives
        const silenceTimeoutId = setTimeout(() => {
            // We set the alert message to inform the user why it skipped
            setAlertMessage("Moved to next question due to 15s of silence.");
            logAlert("silence_timeout");
            evaluateAndAdvance();
        }, 15000); // 15 seconds

        return () => clearTimeout(silenceTimeoutId);
    }, [phase, sessionComplete, transcript, accumulatedTranscript, evaluateAndAdvance, logAlert]);

    // Handle initial read-aloud of questions using TTS
    useEffect(() => {
        if (phase !== 'reading' || !currentQuestion || sessionComplete) return;

        let isCancelled = false;
        let timeoutId: NodeJS.Timeout;

        const speakQuestion = () => {
            if (isCancelled) return;

            window.speechSynthesis.cancel();

            const textToSpeak = currentQuestion.question;
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.lang = 'en-US';
            utterance.rate = 0.95;

            // Ensure voice is assigned if available
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                const englishVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
                utterance.voice = englishVoice;
            }

            utterance.onboundary = (e) => {
                if (e.name === 'word') {
                    const textUntilNow = textToSpeak.substring(0, e.charIndex + e.charLength);
                    setSpokenText(textUntilNow);
                }
            };

            utterance.onend = () => {
                if (isCancelled) return;
                setSpokenText(textToSpeak);
                setTimeout(() => {
                    if (!isCancelled) setPhase('answering');
                }, 800);
            };

            utterance.onerror = (e) => {
                if (!isCancelled) setPhase('answering'); // Graceful fallback
            };

            window.speechSynthesis.speak(utterance);
        };

        // Wait for voices to load (Chrome bug workaround)
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            let retries = 0;
            const tryLoadVoices = () => {
                if (isCancelled) return;
                if (window.speechSynthesis.getVoices().length > 0) {
                    speakQuestion();
                } else if (retries < 10) {
                    retries++;
                    timeoutId = setTimeout(tryLoadVoices, 200); // Wait 200ms and try again
                } else {
                    // Timeout loading voices (2 seconds), fallback to answering
                    setPhase('answering');
                }
            };

            timeoutId = setTimeout(tryLoadVoices, 100);
        } else {
            // TTS not supported
            setPhase('answering');
        }

        return () => {
            isCancelled = true;
            clearTimeout(timeoutId);
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, [currentIdx, currentQuestion, phase, sessionComplete]);

    // Navigate to result when complete
    useEffect(() => {
        if (sessionComplete) {
            const allAnswers = encodeURIComponent(JSON.stringify(answers));
            const allAlerts = encodeURIComponent(JSON.stringify(alertEvents.map((a) => ({ type: a.type, time: a.time.toISOString() }))));
            const queryId = interviewId || 'demo';
            setTimeout(() => {
                router.push(`/interview/result/${queryId}?answers=${allAnswers}&alerts=${allAlerts}`);
            }, 1500);
        }
    }, [sessionComplete, answers, alertEvents, interviewId, router]);

    // Auto-clear alert message after 5 seconds
    useEffect(() => {
        if (alertMessage) {
            const timer = setTimeout(() => {
                setAlertMessage('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [alertMessage]);

    if (sessionComplete) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center glass rounded-3xl p-12"
                >
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-3xl font-bold text-white mb-2">Interview Complete!</h2>
                    <p className="text-slate-400 mb-4">Generating your personalized report...</p>
                    <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            {/* Top Bar */}
            <div className="glass-dark border-b border-surface-700 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-xl">🎓</span>
                    <span className="font-semibold text-white">VisaPrep AI</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-400 text-sm">Live Interview</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <span>Question</span>
                        <span className="text-white font-bold">{currentIdx + 1}</span>
                        <span>/</span>
                        <span>{totalQuestions}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-24 h-1.5 bg-surface-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500"
                            style={{ width: `${((currentIdx + 1) / totalQuestions) * 100}%` }}
                        />
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="recording-dot" />
                        <span className="text-xs text-slate-400">Recording</span>
                    </div>
                </div>
            </div>

            {/* Alert Banner */}
            <AnimatePresence>
                {alertMessage && (
                    <AlertBanner
                        key="alert-banner-static"
                        message={alertMessage}
                        onDismiss={() => setAlertMessage('')}
                    />
                )}
            </AnimatePresence>

            {/* Main Layout */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-0 overflow-hidden">
                {/* Left: Webcam + Alert Log */}
                <div className="lg:col-span-1 flex flex-col gap-4 p-4 border-r border-surface-700">
                    {/* Webcam */}
                    <div className="webcam-container aspect-video bg-surface-800">
                        <WebcamMonitor onAlert={handleFaceAlert} />
                    </div>

                    {/* Face Status */}
                    <div className="glass rounded-xl px-4 py-3 text-sm text-slate-300 flex items-center gap-2">
                        <span className="text-green-400 text-lg">👤</span>
                        <span>Face monitoring active</span>
                    </div>

                    {/* Alert Log */}
                    {alertEvents.length > 0 && (
                        <div className="glass rounded-xl p-4">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                                Alerts ({alertEvents.length})
                            </h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {alertEvents.map((evt, i) => (
                                    <div key={i} className="flex items-start gap-2 text-xs">
                                        <span className="text-warning-400">⚠️</span>
                                        <div>
                                            <div className="text-slate-300">{evt.type.replace(/_/g, ' ')}</div>
                                            <div className="text-slate-600">{evt.time.toLocaleTimeString()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Center: Question + Transcript */}
                <div className="lg:col-span-2 flex flex-col p-6 gap-6">
                    {/* Question Category */}
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-900/50 border border-primary-700/30 text-primary-300 text-xs font-medium mb-4">
                            <span>📋</span>
                            {currentQuestion?.category}
                        </div>

                        {/* Question Display */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentIdx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.4 }}
                            >
                                <h2 className="text-2xl lg:text-3xl font-bold text-white leading-tight mb-3">
                                    {currentQuestion?.question}
                                </h2>
                                <p className="text-sm text-slate-500 italic">
                                    💡 Tip: {currentQuestion?.tips}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Timer */}
                    <div className="flex items-center gap-4">
                        <QuestionTimer
                            key={questionKey}
                            durationSeconds={currentQuestion?.timeSeconds || 40}
                            onTimeExpired={evaluateAndAdvance}
                            disabled={phase !== 'answering'}
                        />
                        <div className="flex-1">
                            <div className="text-sm text-slate-400">
                                {phase === 'reading'
                                    ? '🔊 Interviewer is speaking...'
                                    : phase === 'evaluating'
                                        ? '🤖 AI is evaluating your answer...'
                                        : 'Speak your answer clearly. Timer auto-advances to next question.'}
                            </div>
                        </div>
                    </div>

                    {/* Live Transcript */}
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                                {phase === 'reading' ? 'Live Captions (Interviewer)' : 'Live Transcript (You)'}
                            </h3>
                            {phase !== 'reading' && (
                                <SpeechCapture
                                    key={questionKey}
                                    onTranscriptUpdate={handleTranscriptUpdate}
                                    disabled={phase !== 'answering'}
                                />
                            )}
                        </div>

                        <div className={`transcript-box min-h-[140px] transition-colors ${phase === 'reading' ? 'border-primary-500/30 bg-primary-900/10' : ''}`} id="live-transcript-box">
                            {phase === 'reading' ? (
                                <span className="text-primary-300 font-medium text-lg leading-relaxed">{spokenText}</span>
                            ) : (
                                <>
                                    {accumulatedTranscript && (
                                        <span className="text-slate-200">{accumulatedTranscript}</span>
                                    )}
                                    {transcript && (
                                        <span className="text-slate-400">{accumulatedTranscript ? ' ' : ''}{transcript}</span>
                                    )}
                                    {!accumulatedTranscript && !transcript && (
                                        <span className="text-slate-600 italic">Start speaking — your words will appear here...</span>
                                    )}
                                </>
                            )}
                            <span className="transcript-cursor" />
                        </div>
                    </div>

                    {/* Evaluating Overlay */}
                    {phase === 'evaluating' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-3 glass rounded-xl px-4 py-3"
                        >
                            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm text-primary-300">
                                AI is evaluating your response and preparing the next question...
                            </span>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function InterviewSessionPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <InterviewSessionContent />
        </Suspense>
    );
}
