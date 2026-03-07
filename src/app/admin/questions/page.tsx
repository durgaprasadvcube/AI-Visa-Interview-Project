'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { SAMPLE_VISA_QUESTIONS } from '@/data/sample-questions';

interface Question {
    id: number;
    category: string;
    question: string;
    tips: string;
    timeSeconds: number;
}

export default function AdminQuestionsPage() {
    const [questions, setQuestions] = useState<Question[]>(SAMPLE_VISA_QUESTIONS);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState('');
    const [dragOver, setDragOver] = useState(false);

    const handlePdfUpload = async (file: File) => {
        if (!file || file.type !== 'application/pdf') {
            setUploadError('Please upload a valid PDF file.');
            return;
        }

        setUploading(true);
        setUploadError('');
        setUploadSuccess('');

        const formData = new FormData();
        formData.append('pdf', file);

        try {
            const res = await fetch('/api/questions', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setQuestions(data.questions);
            setUploadSuccess(`✅ Successfully parsed ${data.total} questions from PDF!`);
        } catch (err: unknown) {
            setUploadError(err instanceof Error ? err.message : 'Failed to parse PDF.');
        } finally {
            setUploading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handlePdfUpload(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handlePdfUpload(file);
    };

    return (
        <div className="min-h-screen py-10 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1">Question Bank</h1>
                        <p className="text-slate-400 text-sm">Upload a PDF to replace the question bank</p>
                    </div>
                    <Link href="/" className="btn-secondary py-2 px-4 rounded-xl text-sm">
                        ← Back
                    </Link>
                </div>

                {/* Upload Zone */}
                <div
                    className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all ${dragOver
                            ? 'border-primary-400 bg-primary-900/20'
                            : 'border-surface-600 bg-surface-800/30 hover:border-primary-600/50'
                        }`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                >
                    <div className="text-5xl mb-4">{uploading ? '⏳' : '📄'}</div>
                    <h2 className="text-lg font-semibold text-white mb-2">
                        {uploading ? 'Parsing PDF...' : 'Upload Question PDF'}
                    </h2>
                    <p className="text-slate-400 text-sm mb-6">
                        PDF should contain numbered questions (e.g., "1. Why did you choose this university?")
                    </p>
                    <label className="cursor-pointer">
                        <input
                            type="file"
                            accept="application/pdf"
                            onChange={handleFileChange}
                            className="hidden"
                            id="pdf-upload-input"
                            disabled={uploading}
                        />
                        <span className="btn-primary py-2.5 px-6 rounded-xl text-sm cursor-pointer">
                            {uploading ? 'Processing...' : 'Choose PDF File'}
                        </span>
                    </label>
                    <p className="text-slate-600 text-xs mt-4">or drag & drop a PDF here</p>
                </div>

                {/* Error / Success */}
                <AnimatePresence>
                    {uploadError && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="alert-danger text-sm" id="upload-error">
                            {uploadError}
                        </motion.div>
                    )}
                    {uploadSuccess && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="alert-success text-sm" id="upload-success">
                            {uploadSuccess}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Question List */}
                <div>
                    <h2 className="text-xl font-bold text-white mb-4">
                        Current Questions ({questions.length})
                    </h2>
                    <div className="space-y-3">
                        {questions.map((q, i) => (
                            <motion.div
                                key={q.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="glass rounded-xl px-5 py-4 flex items-start gap-4"
                            >
                                <div className="w-8 h-8 rounded-lg bg-primary-900/50 border border-primary-700/30 flex items-center justify-center text-primary-300 font-bold text-sm flex-shrink-0">
                                    {q.id}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs text-slate-500 mb-1">{q.category} • {q.timeSeconds}s</div>
                                    <div className="text-white text-sm font-medium leading-snug">{q.question}</div>
                                    {q.tips && (
                                        <div className="text-xs text-slate-600 mt-1 italic">{q.tips}</div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
