'use client';

export const dynamic = 'force-dynamic';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

type PermissionState = 'idle' | 'requesting' | 'granted' | 'denied';

interface ScheduleInfo {
    id: string;
    student_id: string;
    start_time: string;
    end_time: string;
    status: string;
    interview_type?: string;
}

interface InterviewResult {
    id: string;
    user_id: string;
    start_time: string;
    end_time: string;
    final_score: number;
}

export default function StartInterviewPage() {
    const [cameraState, setCameraState] = useState<PermissionState>('idle');
    const [micState, setMicState] = useState<PermissionState>('idle');
    const [loading, setLoading] = useState(true);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const router = useRouter();
    const [supabase, setSupabase] = useState<any>(null);

    // Scheduling State
    const [allSchedules, setAllSchedules] = useState<ScheduleInfo[]>([]);
    const [allResults, setAllResults] = useState<InterviewResult[]>([]);
    const [schedule, setSchedule] = useState<ScheduleInfo | null>(null);
    const [isTooEarly, setIsTooEarly] = useState(false);
    const [isTooLate, setIsTooLate] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState('');
    const [isCompleted, setIsCompleted] = useState(false);

    useEffect(() => {
        try { setSupabase(createClient()); } catch (e) { }
    }, []);

    const validateTimeWindow = useCallback((s: ScheduleInfo) => {
        const now = new Date();
        const start = new Date(s.start_time);
        const end = new Date(s.end_time);

        if (now < start) {
            setIsTooEarly(true);
            setIsTooLate(false);

            const diff = start.getTime() - now.getTime();
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);

            let timeStr = '';
            if (hours > 0) timeStr += `${hours}h `;
            if (mins > 0 || hours > 0) timeStr += `${mins}m `;
            timeStr += `${secs}s`;
            setTimeRemaining(timeStr);

        } else if (now > end) {
            setIsTooEarly(false);
            setIsTooLate(true);
            setTimeRemaining('');
        } else {
            setIsTooEarly(false);
            setIsTooLate(false);
            setTimeRemaining('');
        }
    }, []);

    const checkSchedule = useCallback(async () => {
        if (!supabase) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/auth');
                return;
            }

            // Get ALL scheduled interviews for this student
            const { data: schedulesData } = await supabase
                .from('scheduled_interviews')
                .select('*')
                .eq('student_id', user.id)
                .order('start_time', { ascending: false });

            // Get all results
            const { data: resultsData } = await supabase
                .from('interviews')
                .select('id, user_id, start_time, end_time, final_score')
                .eq('user_id', user.id)
                .not('end_time', 'is', null)
                .order('start_time', { ascending: false });

            if (schedulesData) setAllSchedules(schedulesData);
            if (resultsData) setAllResults(resultsData);

            if (schedulesData && schedulesData.length > 0) {
                const now = new Date();
                const pendings = schedulesData.filter((s: ScheduleInfo) => s.status === 'pending');

                if (pendings.length > 0) {
                    const sortedPendings = [...pendings].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
                    const activeOrFuture = sortedPendings.find((s: ScheduleInfo) => new Date(s.end_time) > now);

                    if (activeOrFuture) {
                        setSchedule(activeOrFuture);
                        validateTimeWindow(activeOrFuture);
                        setIsCompleted(false);
                    } else {
                        setSchedule(null);
                        setIsCompleted(false);
                    }
                } else {
                    // Check if the most recent one overall is completed
                    const latest = schedulesData[0];
                    if (latest.status === 'completed') {
                        setSchedule(latest);
                        setIsCompleted(true);
                        setIsTooEarly(false);
                        setIsTooLate(false);
                    } else {
                        setSchedule(null);
                        setIsCompleted(false);
                    }
                }
            } else {
                setSchedule(null);
                setIsCompleted(false);
            }
        } catch (err) {
            console.error("Check Schedule Error:", err);
        } finally {
            setLoading(false);
        }
    }, [supabase, router, validateTimeWindow]);

    useEffect(() => {
        if (supabase) checkSchedule();
    }, [supabase, checkSchedule]);

    useEffect(() => {
        if (!schedule || loading || isCompleted || isTooLate) return;
        const interval = setInterval(() => validateTimeWindow(schedule), 1000);
        return () => clearInterval(interval);
    }, [schedule, loading, isCompleted, isTooLate, validateTimeWindow]);

    useEffect(() => {
        return () => {
            stream?.getTracks().forEach((t) => t.stop());
        };
    }, [stream]);

    const requestPermissions = useCallback(async () => {
        setCameraState('requesting');
        setMicState('requesting');
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' },
                audio: true,
            });
            setStream(mediaStream);
            setCameraState('granted');
            setMicState('granted');
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch {
            setCameraState('denied');
            setMicState('denied');
        }
    }, []);

    const startInterview = async () => {
        if (isTooEarly || isTooLate || isCompleted) return;
        setLoading(true);
        try {
            if (!supabase) throw new Error("Supabase is not configured.");

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/auth');
                return;
            }

            const res = await fetch('/api/interviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    total_questions: 10,
                    schedule_id: schedule?.id
                }),
            });

            const data = await res.json();

            if (data.interview?.id) {
                stream?.getTracks().forEach((t) => t.stop());
                const sessionUrl = `/interview/session?id=${data.interview.id}${schedule ? `&schedule_id=${schedule.id}` : ''}`;
                router.push(sessionUrl);
            } else {
                throw new Error("Failed to create interview");
            }
        } catch {
            stream?.getTracks().forEach((t) => t.stop());
            router.push('/interview/session?demo=true');
        }
    };

    const handleLogout = async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
        router.push('/');
    };

    const getResultForSchedule = (sched: ScheduleInfo) => {
        const stWindow = new Date(sched.start_time).getTime() - (1000 * 60 * 60 * 24); // 1 day before
        const edWindow = new Date(sched.end_time).getTime() + (1000 * 60 * 60 * 24); // 1 day after

        return allResults.find(r => {
            const rTime = new Date(r.start_time).getTime();
            return rTime >= stWindow && rTime <= edWindow;
        }) || allResults[0];
    };

    const renderScheduleCard = (s: ScheduleInfo) => {
        const now = new Date();
        const st = new Date(s.start_time);
        const ed = new Date(s.end_time);

        if (s.status === 'completed') {
            const result = getResultForSchedule(s);
            return (
                <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-surface-800/80 border border-surface-700 hover:border-surface-600 transition-colors gap-3">
                    <div>
                        <div className="text-sm font-semibold text-white flex items-center gap-2">
                            <span>✅</span> Completed {st.toLocaleDateString()}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">{st.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {ed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    {result ? (
                        <button onClick={() => router.push(`/interview/result/${result.id}`)} className="text-sm px-4 py-2 rounded-lg bg-accent-500/10 text-accent-400 font-semibold border border-accent-500/20 hover:bg-accent-500/20 transition-all whitespace-nowrap">
                            View Feedback →
                        </button>
                    ) : (
                        <span className="text-xs text-accent-400 font-medium px-3 py-1 bg-accent-500/10 rounded-full border border-accent-500/20">Results Pending</span>
                    )}
                </div>
            );
        }

        if (s.status === 'pending' && now > ed) {
            return (
                <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-surface-800/40 border border-surface-700/50 opacity-70 gap-3">
                    <div>
                        <div className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                            <span>❌</span> Missed {st.toLocaleDateString()}
                        </div>
                        <div className="text-xs text-slate-500 line-through mt-1">{st.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {ed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <span className="text-xs text-danger-400 font-medium px-3 py-1 bg-danger-500/10 rounded-full border border-danger-500/20">Expired</span>
                </div>
            );
        }

        if (s.status === 'pending' && now < st) {
            return (
                <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-primary-900/10 border border-primary-500/20 gap-3">
                    <div>
                        <div className="text-sm font-semibold text-primary-200 flex items-center gap-2">
                            <span>⏳</span> Upcoming {st.toLocaleDateString()}
                        </div>
                        <div className="text-xs text-primary-400/70 mt-1">{st.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {ed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <span className="text-xs text-primary-400 font-medium px-3 py-1 bg-primary-500/10 rounded-full border border-primary-500/20">Future</span>
                </div>
            );
        }

        // Active
        return (
            <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-warning-900/20 border border-warning-500/30 gap-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-warning-500" />
                <div className="pl-2">
                    <div className="text-sm font-semibold text-warning-300 flex items-center gap-2">
                        <span className="animate-pulse">🟢</span> Available Now
                    </div>
                    <div className="text-xs text-warning-400/80 mt-1">{st.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {ed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-sm px-4 py-2 rounded-lg bg-warning-500/20 text-warning-400 font-bold border border-warning-500/30 hover:bg-warning-500/30 transition-all shadow-lg shadow-warning-500/10 whitespace-nowrap">
                    Start Interview
                </button>
            </div>
        );
    };

    const allGranted = cameraState === 'granted' && micState === 'granted';

    const checkIcon = (state: PermissionState) => {
        if (state === 'idle') return '○';
        if (state === 'requesting') return '⏳';
        if (state === 'granted') return '✓';
        return '✗';
    };

    const checkColor = (state: PermissionState) => {
        if (state === 'granted') return 'text-accent-400';
        if (state === 'denied') return 'text-danger-400';
        if (state === 'requesting') return 'text-warning-400';
        return 'text-slate-500';
    };

    if (loading && !schedule && !isTooEarly && !isTooLate) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center px-4 py-12 relative overflow-x-hidden">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-5xl relative"
            >
                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className="absolute top-0 right-0 z-10 hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-800/80 border border-surface-700 text-slate-300 text-sm font-semibold hover:bg-danger-500/10 hover:text-danger-400 hover:border-danger-500/30 transition-all shadow-lg backdrop-blur-sm"
                >
                    <span>🚪</span> Sign Out
                </button>

                {/* Header */}
                <div className="text-center mb-10 mt-12 md:mt-0 relative">
                    <button
                        onClick={handleLogout}
                        className="md:hidden absolute -top-8 right-0 flex right-aligned items-center gap-2 px-4 py-2 rounded-xl bg-surface-800/80 border border-surface-700 text-slate-300 text-sm font-semibold hover:bg-danger-500/10 hover:text-danger-400 hover:border-danger-500/30 transition-all shadow-lg backdrop-blur-sm"
                    >
                        <span>🚪</span> Sign Out
                    </button>
                    <div className="text-5xl mb-4">🎓</div>
                    <h1 className="text-4xl font-bold text-white mb-4">
                        Ready to <span className="gradient-text">Interview?</span>
                    </h1>

                    {schedule && !isCompleted && !isTooLate ? (
                        <div className="inline-flex items-center gap-2 px-5 py-2.5 mt-2 rounded-full bg-surface-800/80 border border-surface-700 text-sm shadow-xl backdrop-blur-sm">
                            <span>📅</span>
                            <span className="text-slate-300">Next Scheduled:</span>
                            <span className="text-white font-bold">{new Date(schedule.start_time).toLocaleDateString()}</span>
                            <span className="text-slate-500 mx-2">|</span>
                            <span className="text-primary-300 font-semibold whitespace-pre">
                                {new Date(schedule.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(schedule.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    ) : isCompleted ? (
                        <div className="inline-flex items-center gap-2 px-5 py-2.5 mt-2 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-400 text-sm font-medium shadow-lg">
                            <span>✅</span> You have completed your scheduled interview. View feedback below.
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-2 px-5 py-2.5 mt-2 rounded-full bg-surface-800/80 border border-surface-700 text-slate-300 text-sm shadow-xl">
                            <span>ℹ️</span> You don't have any active scheduled interviews. Scroll to view history.
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left/Main: Webcam Preview & Primary Action */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Camera Preview (Always visible for testing/practice) */}
                        <div className="glass rounded-3xl p-6 shadow-2xl border border-surface-600/50">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <span>🎥</span> Camera Preview
                                </h2>
                                {isTooEarly && schedule && !isCompleted && (
                                    <span className="text-xs bg-warning-500/10 text-warning-400 px-3 py-1 rounded-full border border-warning-500/20 font-bold">Starts in {timeRemaining}</span>
                                )}
                            </div>

                            <div className="webcam-container aspect-video bg-surface-900 rounded-2xl flex items-center justify-center border-2 border-surface-700 overflow-hidden relative shadow-inner">
                                {cameraState === 'granted' ? (
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        muted
                                        playsInline
                                        className="w-full h-full object-cover transform scale-x-[-1]"
                                        id="start-webcam-preview"
                                    />
                                ) : (
                                    <div className="text-center text-slate-500 p-8">
                                        <div className="text-5xl mb-3 opacity-50">📷</div>
                                        <p className="text-sm font-medium">Camera hidden until permissions granted</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* My Sessions List */}
                        <div className="glass rounded-3xl p-6 shadow-xl border border-surface-600/50">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <span>📋</span> My Sessions
                            </h2>
                            {allSchedules.length > 0 ? (
                                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                    {allSchedules.map(renderScheduleCard)}
                                </div>
                            ) : (
                                <div className="text-center py-10 bg-surface-800/50 rounded-2xl border border-surface-700 border-dashed">
                                    <span className="text-4xl mb-3 block opacity-50">🗓️</span>
                                    <p className="text-slate-400 font-medium">No sessions scheduled yet.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Permission Checklist & Time Locks */}
                    <div className="space-y-6">

                        {/* Status Lock Warning */}
                        <AnimatePresence>
                            {(isTooEarly || isTooLate) && schedule && !isCompleted && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="glass rounded-3xl p-6 border border-warning-500/30 bg-warning-500/5 relative overflow-hidden shadow-xl"
                                >
                                    <div className="absolute top-0 left-0 w-1 h-full bg-warning-500" />
                                    <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                        <span>🔒</span> Interview Locked
                                    </h3>
                                    {isTooEarly ? (
                                        <>
                                            <p className="text-slate-300 text-sm mb-4 leading-relaxed">Your scheduled interview window has not started yet. Please wait until the exact start time.</p>
                                            <div className="text-4xl font-mono font-black text-warning-400 tracking-wider drop-shadow-lg">
                                                {timeRemaining}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-2 uppercase tracking-widest font-bold">Until Start Time</div>
                                        </>
                                    ) : (
                                        <div className="space-y-4">
                                            <p className="text-slate-300 text-sm leading-relaxed">Your scheduled interview window has closed. Please contact the administration to reschedule.</p>
                                            <button
                                                onClick={() => { setLoading(true); checkSchedule(); }}
                                                className="w-full py-3 rounded-xl bg-warning-500/10 hover:bg-warning-500/20 text-warning-400 text-sm font-bold border border-warning-500/30 transition-all flex items-center justify-center gap-2"
                                            >
                                                <span>🔄</span> Check for Updates
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Permission Checklist (Always visible for practice) */}
                        <div className="glass rounded-3xl p-6 shadow-xl border border-surface-600/50">
                            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <span>🔐</span> Hardware Check
                            </h2>
                            <div className="space-y-5">
                                {[
                                    { label: 'Camera Access', state: cameraState, desc: 'Required for face monitoring' },
                                    { label: 'Microphone Access', state: micState, desc: 'Required for voice capture' },
                                ].map((item) => (
                                    <div key={item.label} className="flex items-start gap-4 p-3 rounded-xl bg-surface-800/50 border border-surface-700/50">
                                        <div className={`text-xl font-black mt-0.5 drop-shadow-md ${checkColor(item.state)}`}>
                                            {checkIcon(item.state)}
                                        </div>
                                        <div>
                                            <div className="text-white font-bold text-sm tracking-wide">{item.label}</div>
                                            <div className="text-slate-500 text-xs mt-1 font-medium">{item.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {cameraState !== 'granted' && (
                                <button
                                    onClick={requestPermissions}
                                    disabled={cameraState === 'requesting'}
                                    className="w-full mt-6 btn-secondary py-3.5 rounded-xl font-bold border-2 border-primary-500/30 hover:border-primary-500/60 transition-all"
                                >
                                    {cameraState === 'requesting' ? 'Requesting...' : 'Allow Permissions'}
                                </button>
                            )}
                        </div>

                        {/* Start Button */}
                        {allGranted && !(isTooEarly || isTooLate) && !isCompleted && schedule && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={startInterview}
                                disabled={loading}
                                className="w-full btn-primary py-5 rounded-xl text-lg font-black shadow-lg shadow-primary-500/30 group relative overflow-hidden"
                            >
                                <span className={`flex items-center justify-center gap-2 ${loading ? 'opacity-0' : 'opacity-100'}`}>
                                    🚀 Begin Official Interview
                                </span>
                                {loading && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    </div>
                                )}
                            </motion.button>
                        )}

                        {/* Demo Practice button */}
                        {(!schedule || isTooEarly || isTooLate || isCompleted) && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={() => router.push('/interview/session?demo=true')}
                                className="w-full btn-secondary py-4 rounded-xl text-md font-bold hover:shadow-lg hover:shadow-primary-500/10 transition-all flex justify-center items-center gap-2"
                            >
                                <span>🎮</span> Start Practice Demo
                            </motion.button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
