'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

type PermissionState = 'idle' | 'requesting' | 'granted' | 'denied';

interface ScheduleInfo {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
}

export default function StartInterviewPage() {
    const [cameraState, setCameraState] = useState<PermissionState>('idle');
    const [micState, setMicState] = useState<PermissionState>('idle');
    const [loading, setLoading] = useState(true); // Initially loading schedule
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const router = useRouter();
    const [supabase, setSupabase] = useState<any>(null);

    // Scheduling State
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

            // Calculate time remaining
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

            // Get ALL interviews for this student
            const { data } = await supabase
                .from('scheduled_interviews')
                .select('*')
                .eq('student_id', user.id)
                .order('start_time', { ascending: false }); // Most recent first

            console.log("Interviews found for user:", data);

            if (data && data.length > 0) {
                const now = new Date();

                // 1. Look for PENDING first (Priority: Active or Future)
                const pendings = data.filter((s: ScheduleInfo) => s.status === 'pending');
                if (pendings.length > 0) {
                    // Sort pendings by start time ascending for the logic below
                    const sortedPendings = [...pendings].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

                    const activeOrFuture = sortedPendings.find((s: ScheduleInfo) => new Date(s.end_time) > now);
                    const selected = activeOrFuture || sortedPendings[sortedPendings.length - 1]; // If all expired, take the newest pending

                    console.log("Selected pending schedule:", selected);
                    setSchedule(selected);
                    validateTimeWindow(selected);
                    setIsCompleted(false);
                } else {
                    // 2. If no pendings, check if the most recent one is COMPLETED
                    const latest = data[0];
                    if (latest.status === 'completed') {
                        setIsCompleted(true);
                        setSchedule(latest);
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

    // Timer to update countdown
    useEffect(() => {
        if (!schedule || loading) return;

        const interval = setInterval(() => validateTimeWindow(schedule), 1000);
        return () => clearInterval(interval);
    }, [schedule, loading, validateTimeWindow]);

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
        if (isTooEarly || isTooLate) return;
        setLoading(true);
        try {
            if (!supabase) throw new Error("Supabase is not configured.");

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/auth');
                return;
            }

            // Create actual interview record
            const res = await fetch('/api/interviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ total_questions: 10 }),
            });

            const data = await res.json();

            if (schedule) {
                // Mark schedule as in-progress or completed immediately so they can't take it twice
                await supabase
                    .from('scheduled_interviews')
                    .update({ status: 'completed' })
                    .eq('id', schedule.id);
            }

            if (data.interview?.id) {
                stream?.getTracks().forEach((t) => t.stop());
                router.push(`/interview/session?id=${data.interview.id}`);
            } else {
                throw new Error("Failed to create interview");
            }
        } catch {
            stream?.getTracks().forEach((t) => t.stop());
            router.push('/interview/session?demo=true');
        }
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
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-4xl"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="text-5xl mb-4">🎓</div>
                    <h1 className="text-4xl font-bold text-white mb-3">
                        Ready to <span className="gradient-text">Interview?</span>
                    </h1>

                    {schedule && !isCompleted ? (
                        <div className="inline-flex items-center gap-2 px-4 py-2 mt-2 rounded-full bg-surface-800 border border-surface-700 text-sm">
                            <span>📅</span>
                            <span className="text-slate-300">Scheduled for Date:</span>
                            <span className="text-white font-medium">{new Date(schedule.start_time).toLocaleDateString()}</span>
                            <span className="text-slate-500 mx-1">|</span>
                            <span className="text-primary-300 font-medium whitespace-pre">
                                {new Date(schedule.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(schedule.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    ) : isCompleted ? (
                        <div className="inline-flex items-center gap-2 px-4 py-2 mt-2 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-400 text-sm">
                            <span>✅</span> You have already done this interview. Results are being processed.
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-2 px-4 py-2 mt-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
                            <span>⚠️</span> You don't have a scheduled interview. You can try a Demo instead.
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Webcam Preview */}
                    <div className="space-y-4">
                        <div className="webcam-container aspect-video bg-surface-800 flex items-center justify-center">
                            {cameraState === 'granted' ? (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover"
                                    id="start-webcam-preview"
                                />
                            ) : (
                                <div className="text-center text-slate-500 p-8">
                                    <div className="text-5xl mb-3">📷</div>
                                    <p className="text-sm">Camera preview will appear here</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Permission Checklist & Time Locks */}
                    <div className="space-y-6">

                        {/* Status Lock Warning */}
                        <AnimatePresence>
                            {(isTooEarly || isTooLate) && schedule && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="glass rounded-2xl p-6 border border-warning-500/30 bg-warning-500/5 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-1 h-full bg-warning-500" />
                                    <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                        <span>🔒</span> Interview Locked
                                    </h3>
                                    {isTooEarly ? (
                                        <>
                                            <p className="text-slate-300 text-sm mb-4">Your scheduled interview window has not started yet. Please wait until the exact start time.</p>
                                            <div className="text-3xl font-mono font-bold text-warning-400 tracking-wider">
                                                {timeRemaining}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Until Start Time</div>
                                        </>
                                    ) : (
                                        <div className="space-y-4">
                                            <p className="text-slate-300 text-sm">Your scheduled interview window has closed. Please contact the administration to reschedule.</p>
                                            <button
                                                onClick={() => { setLoading(true); checkSchedule(); }}
                                                className="px-4 py-2 rounded-lg bg-warning-500/20 hover:bg-warning-500/30 text-warning-400 text-xs font-semibold border border-warning-500/30 transition-all flex items-center gap-2"
                                            >
                                                <span>🔄</span> Check for Updates
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Permission Checklist */}
                        <div className={`glass rounded-2xl p-6 transition-opacity duration-300 ${(isTooEarly || isTooLate) ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                            <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
                                <span>🔐</span> Hardware Check
                            </h2>
                            <div className="space-y-4">
                                {[
                                    { label: 'Camera Access', state: cameraState, desc: 'Required for face monitoring' },
                                    { label: 'Microphone Access', state: micState, desc: 'Required for voice capture' },
                                ].map((item) => (
                                    <div key={item.label} className="flex items-start gap-4">
                                        <div className={`text-xl font-bold mt-0.5 ${checkColor(item.state)}`}>
                                            {checkIcon(item.state)}
                                        </div>
                                        <div>
                                            <div className="text-white font-medium text-sm">{item.label}</div>
                                            <div className="text-slate-500 text-xs mt-0.5">{item.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {cameraState !== 'granted' && !(isTooEarly || isTooLate) && (
                                <button
                                    onClick={requestPermissions}
                                    disabled={cameraState === 'requesting'}
                                    className="w-full mt-6 btn-primary py-3 rounded-xl"
                                >
                                    {cameraState === 'requesting' ? 'Requesting...' : 'Allow Camera & Microphone'}
                                </button>
                            )}
                        </div>

                        {/* Start Button */}
                        {allGranted && !(isTooEarly || isTooLate) && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={startInterview}
                                disabled={loading}
                                className="w-full btn-primary py-4 rounded-xl text-lg font-bold"
                            >
                                {loading ? 'Starting...' : schedule ? '🚀 Begin Official Interview' : '🎮 Start Practice Demo'}
                            </motion.button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
