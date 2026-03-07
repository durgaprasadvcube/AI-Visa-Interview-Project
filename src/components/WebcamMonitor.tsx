'use client';

import { useEffect, useRef, useState } from 'react';

type AlertType = 'multiple_faces' | 'no_face' | 'left_frame' | 'eye_movement';

interface WebcamMonitorProps {
    onAlert: (type: AlertType) => void;
    onStream?: (stream: MediaStream) => void;
}

declare global {
    interface Window {
        faceapi: typeof import('face-api.js');
    }
}

export default function WebcamMonitor({ onAlert, onStream }: WebcamMonitorProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const alertCooldownRef = useRef<Record<string, number>>({});
    const [status, setStatus] = useState<'loading' | 'active' | 'error'>('loading');
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [faceCount, setFaceCount] = useState(0);

    // Load face-api.js models
    useEffect(() => {
        let mounted = true;

        const loadModels = async () => {
            try {
                // Dynamically import face-api.js (client-only)
                const faceapi = await import('face-api.js');

                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
                    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                ]);

                if (mounted) {
                    window.faceapi = faceapi;
                    setModelsLoaded(true);
                }
            } catch (err) {
                console.warn('Face detection models not loaded:', err);
                if (mounted) setModelsLoaded(true);
            }
        };

        loadModels();
        return () => { mounted = false; };
    }, []);

    // Start webcam
    useEffect(() => {
        let mounted = true;

        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480, facingMode: 'user' },
                    audio: true,
                });

                if (!mounted) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                streamRef.current = stream;
                if (onStream) onStream(stream);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setStatus('active');
                }
            } catch (err) {
                if (mounted) setStatus('error');
            }
        };

        startCamera();

        const handleVisibility = () => {
            if (!document.hidden && videoRef.current && streamRef.current) {
                videoRef.current.play().catch(() => { });
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            mounted = false;
            document.removeEventListener('visibilitychange', handleVisibility);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => {
                    t.stop();
                    t.enabled = false;
                });
                streamRef.current = null;
            }
        };
    }, [onStream]);

    // Run face detection loop
    useEffect(() => {
        if (!modelsLoaded || status !== 'active') return;

        const detect = async () => {
            if (!videoRef.current || !window.faceapi || videoRef.current.readyState < 2) return;

            try {
                const detections = await window.faceapi.detectAllFaces(
                    videoRef.current,
                    new window.faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
                ).withFaceLandmarks();

                const count = detections.length;
                setFaceCount(count);

                // Draw on canvas
                if (canvasRef.current && videoRef.current) {
                    const displaySize = {
                        width: videoRef.current.videoWidth || 640,
                        height: videoRef.current.videoHeight || 480,
                    };
                    window.faceapi.matchDimensions(canvasRef.current, displaySize);
                    const resized = window.faceapi.resizeResults(detections, displaySize);

                    const ctx = canvasRef.current.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, displaySize.width, displaySize.height);

                        // Draw face tracking
                        if (count > 0) {
                            window.faceapi.draw.drawDetections(canvasRef.current, resized);
                            // Draw the landmarks (eyes, nose, mouth) - draws subtle dots on the face
                            window.faceapi.draw.drawFaceLandmarks(canvasRef.current, resized);
                        }
                    }
                }

                const now = Date.now();
                const COOLDOWN = 5000;

                if (count === 0) {
                    if (!alertCooldownRef.current.no_face || now - alertCooldownRef.current.no_face > COOLDOWN) {
                        alertCooldownRef.current.no_face = now;
                        onAlert('no_face');
                    }
                } else if (count > 1) {
                    if (!alertCooldownRef.current.multiple_faces || now - alertCooldownRef.current.multiple_faces > COOLDOWN) {
                        alertCooldownRef.current.multiple_faces = now;
                        onAlert('multiple_faces');
                    }
                } else if (count === 1) {
                    // Check for eye movements/looking away
                    const landmarks = detections[0].landmarks;

                    // The nose tip (landmark index 30) relative to the face box gives a primitive 
                    // horizontal center calculation to detect severe head turns.
                    const noseTip = landmarks.positions[30];
                    const faceBox = detections[0].detection.box;

                    // If nose is too far right or left of the center of the bounding box
                    const centerBound = faceBox.x + (faceBox.width / 2);
                    const deviation = Math.abs(noseTip.x - centerBound);
                    const maxDeviation = faceBox.width * 0.25; // Allowed 25% deviation from center

                    if (deviation > maxDeviation) {
                        if (!alertCooldownRef.current.eye_movement || now - alertCooldownRef.current.eye_movement > COOLDOWN) {
                            alertCooldownRef.current.eye_movement = now;
                            onAlert('eye_movement');
                        }
                    }
                }
            } catch (e) {
                console.warn(e);
            }
        };

        intervalRef.current = setInterval(detect, 1000); // Check every second
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [modelsLoaded, status, onAlert]); // deliberately omitting onStream as it doesn't need to trigger re-renders

    if (status === 'error') {
        return (
            <div className="w-full h-full flex items-center justify-center bg-surface-800 text-slate-500 rounded-xl overflow-hidden border border-surface-700">
                <div className="text-center p-6">
                    <div className="text-4xl mb-3">📷</div>
                    <p className="font-medium text-slate-300">Camera Access Required</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-[200px]">Please allow camera permissions in your browser to proceed with the interview setup.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-surface-900 border border-surface-700">
            {status === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface-800/80 z-20 backdrop-blur-sm">
                    <div className="flex flex-col items-center">
                        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
                        <p className="text-xs text-slate-400">Initializing AI Guard...</p>
                    </div>
                </div>
            )}
            <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                id="session-webcam"
                style={{ transform: 'scaleX(-1)' }} // Mirror the video for natural feel
            />
            {/* The canvas uses scaleX(-1) in CSS inside but since video is mirrored, canvas must match perfectly */}
            <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ transform: 'scaleX(-1)' }}
            />

            {/* Face count & Status indicators overlaid on camera */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 items-end z-10 transition-opacity duration-300">
                <div className={`text-xs px-3 py-1.5 rounded-full font-bold shadow-lg flex items-center gap-1.5 backdrop-blur-md ${faceCount === 1
                    ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30'
                    : faceCount === 0
                        ? 'bg-warning-500/20 text-warning-400 border border-warning-500/30'
                        : 'bg-danger-500/20 text-danger-400 border border-danger-500/30'
                    }`}>
                    <span className={`w-2 h-2 rounded-full animate-pulse ${faceCount === 1 ? 'bg-accent-400' : 'bg-current'
                        }`} />
                    {faceCount === 0 ? 'Face Not Detected' : faceCount === 1 ? 'AI Monitor Active' : `Warning: ${faceCount} Faces`}
                </div>
            </div>

            {/* Eye tracking marker */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-900/60 backdrop-blur-md border border-surface-700/50">
                <span className="text-sm">👁️</span>
                <span className="text-[10px] font-medium text-slate-300 uppercase tracking-wider">Gaze Tracking On</span>
            </div>

        </div>
    );
}
