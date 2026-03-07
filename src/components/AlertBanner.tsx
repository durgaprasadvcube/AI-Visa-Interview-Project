'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface AlertBannerProps {
    message: string;
    onDismiss: () => void;
    autoDismissMs?: number;
}

export default function AlertBanner({ message, onDismiss, autoDismissMs = 5000 }: AlertBannerProps) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            onDismiss();
        }, autoDismissMs);
        return () => clearTimeout(timer);
    }, [onDismiss, autoDismissMs]);

    if (!visible) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] max-w-md w-full mx-4"
            id="alert-banner"
        >
            <div className="bg-danger-600/95 backdrop-blur-md border border-danger-500/50 rounded-2xl px-5 py-4 shadow-2xl flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">🚨</span>
                <div className="flex-1">
                    <div className="font-semibold text-white text-sm">{message}</div>
                    <div className="text-danger-200 text-xs mt-0.5">This event has been logged.</div>
                </div>
                <button
                    onClick={() => { setVisible(false); onDismiss(); }}
                    className="text-danger-200 hover:text-white transition-colors text-lg leading-none flex-shrink-0"
                    aria-label="Dismiss alert"
                    id="alert-dismiss-btn"
                >
                    ×
                </button>
            </div>
            {/* Progress bar showing auto-dismiss countdown */}
            <div className="h-1 bg-danger-800/50 rounded-b-2xl overflow-hidden -mt-px">
                <motion.div
                    className="h-full bg-danger-400"
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: autoDismissMs / 1000, ease: 'linear' }}
                />
            </div>
        </motion.div>
    );
}
