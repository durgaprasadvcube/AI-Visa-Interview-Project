'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface QuestionTimerProps {
    durationSeconds: number;
    onTimeExpired: () => void;
    disabled?: boolean;
}

export default function QuestionTimer({ durationSeconds, onTimeExpired, disabled }: QuestionTimerProps) {
    const [timeLeft, setTimeLeft] = useState(durationSeconds);
    const [fired, setFired] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (disabled) return;

        intervalRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current!);
                    if (!fired) {
                        setFired(true);
                        setTimeout(() => onTimeExpired(), 50);
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [onTimeExpired, disabled, fired]);

    const progress = timeLeft / durationSeconds;
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progress);

    const getColor = () => {
        if (progress > 0.5) return '#34d399'; // green
        if (progress > 0.25) return '#f59e0b'; // amber
        return '#ef4444'; // red
    };

    const color = getColor();

    return (
        <div className="flex items-center gap-4" id="question-timer">
            {/* Circular timer */}
            <div className="relative flex-shrink-0">
                <svg width="70" height="70" viewBox="0 0 70 70">
                    {/* Background circle */}
                    <circle
                        cx="35"
                        cy="35"
                        r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="4"
                    />
                    {/* Progress circle */}
                    <motion.circle
                        cx="35"
                        cy="35"
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        transform="rotate(-90 35 35)"
                        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                        transition={{ duration: 0.5 }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span
                        className="text-xl font-black"
                        style={{ color }}
                    >
                        {timeLeft}
                    </span>
                </div>
            </div>

            {/* Label */}
            <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">Time Remaining</div>
                <div
                    className="text-sm font-medium"
                    style={{ color }}
                >
                    {timeLeft > 10
                        ? 'Answer clearly and completely'
                        : timeLeft > 0
                            ? '⚡ Almost done!'
                            : '⏰ Time up!'}
                </div>
            </div>
        </div>
    );
}
