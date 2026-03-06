'use client';

import { useEffect, useState } from 'react';

interface SpeechCaptureProps {
    onTranscriptUpdate: (text: string, isFinal: boolean) => void;
    disabled?: boolean;
}

export default function SpeechCapture({ onTranscriptUpdate, disabled }: SpeechCaptureProps) {
    const [isListening, setIsListening] = useState(false);
    const [supported, setSupported] = useState(true);

    useEffect(() => {
        const SpeechRecognition =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setSupported(false);
            return;
        }

        if (disabled) {
            setIsListening(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        let shouldRestart = true;

        recognition.onresult = (event: any) => {
            let interim = '';
            let finalText = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalText += result[0].transcript;
                } else {
                    interim += result[0].transcript;
                }
            }

            if (finalText) onTranscriptUpdate(finalText.trim(), true);
            if (interim) onTranscriptUpdate(interim.trim(), false);
        };

        recognition.onerror = (event: any) => {
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                console.warn('Speech recognition error:', event.error);
            }
        };

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onend = () => {
            setIsListening(false);
            if (shouldRestart && !disabled) {
                setTimeout(() => {
                    try { recognition.start(); } catch { }
                }, 300);
            }
        };

        // Delay starting slightly so TTS can fully release the microphone lock
        const startTimer = setTimeout(() => {
            try {
                recognition.start();
            } catch (e) {
                console.warn("Failed to start speech recognition automatically", e);
            }
        }, 500);

        return () => {
            shouldRestart = false; // Prevent onend bounds
            clearTimeout(startTimer);
            try {
                recognition.abort();
            } catch { }
            setIsListening(false);
        };
    }, [onTranscriptUpdate, disabled]);

    if (!supported) {
        return (
            <div className="text-xs text-warning-400 flex items-center gap-1" id="speech-unsupported">
                <span>⚠️</span> Speech API not supported. Use Chrome/Edge.
            </div>
        );
    }

    return (
        <div
            className={`flex items-center gap-2 text-xs px-2 py-1 rounded-full ${isListening
                ? 'bg-accent-500/10 text-accent-400 border border-accent-500/20'
                : 'bg-surface-700 text-slate-500 border border-surface-600'
                }`}
            id="speech-status-indicator"
        >
            {isListening ? (
                <>
                    <div className="recording-dot" style={{ width: 6, height: 6 }} />
                    Listening...
                </>
            ) : (
                <>
                    <span>🎤</span>
                    <span>{disabled ? 'Paused' : 'Starting...'}</span>
                </>
            )}
        </div>
    );
}
