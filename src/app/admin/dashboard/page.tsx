'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface Profile {
    id: string;
    email: string;
    role: string;
}

interface ScheduledInterview {
    id: string;
    student_id: string;
    start_time: string;
    end_time: string;
    status: string;
    student_email?: string;
    interview_type: string;
    question_bank_id?: string;
}

interface CompletedInterview {
    id: string;
    user_id: string;
    start_time: string;
    end_time: string;
    final_score: number;
    user_email?: string;
}

interface QuestionBank {
    id: string;
    title: string;
    questions: string[];
    created_at: string;
}

export default function AdminDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [schedules, setSchedules] = useState<ScheduledInterview[]>([]);
    const [results, setResults] = useState<CompletedInterview[]>([]);
    const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);

    // Scheduling Form State
    const [selectedStudent, setSelectedStudent] = useState('');
    const [scheduleDate, setScheduleDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [interviewType, setInterviewType] = useState('official');
    const [selectedBankId, setSelectedBankId] = useState('');
    const [scheduling, setScheduling] = useState(false);

    // Upload State
    const [uploadingPdf, setUploadingPdf] = useState(false);

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const checkAdminAndLoadData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/admin/login');
                return;
            }

            // Verify admin role
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();

            if (!profile || profile.role !== 'admin') {
                router.push('/admin/login');
                return;
            }

            await loadDashboardData();
        };

        checkAdminAndLoadData();
    }, [router]);

    const loadDashboardData = async () => {
        try {
            // 1. Get all students
            const { data: studentsData } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'student');

            if (studentsData) setProfiles(studentsData);

            // 2. Get scheduling info
            const { data: scheduleData } = await supabase
                .from('scheduled_interviews')
                .select('*')
                .order('start_time', { ascending: false });

            if (scheduleData && studentsData) {
                const mappedSchedules = scheduleData.map(s => ({
                    ...s,
                    student_email: studentsData.find(st => st.id === s.student_id)?.email || 'Unknown'
                }));
                setSchedules(mappedSchedules);
            }

            // 3. Get all completed interviews
            const { data: interviewsData } = await supabase
                .from('interviews')
                .select('*')
                .not('end_time', 'is', null)
                .order('end_time', { ascending: false });

            if (interviewsData && studentsData) {
                const mappedResults = interviewsData.map(r => ({
                    ...r,
                    user_email: studentsData.find(st => st.id === r.user_id)?.email || 'Unknown/Admin'
                }));
                setResults(mappedResults);
            }

            // 4. Get Question Banks
            const { data: banksData } = await supabase
                .from('question_banks')
                .select('*')
                .order('created_at', { ascending: false });

            if (banksData) setQuestionBanks(banksData);

        } catch (error) {
            // Silently fail in production
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingPdf(true);
        try {
            // Read PDF file as ArrayBuffer
            const arrayBuffer = await file.arrayBuffer();

            // Extract text using pdfjs-dist
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                fullText += pageText + '\n';
            }

            // Very basic heuristic to split sentences/bullets into an array of questions
            // (Assumes questions end with '?' or are separated by newlines)
            const extractedQuestions = fullText
                .split(/\n|(?<=\?)\s+/)
                .map(q => q.trim())
                .filter(q => q.length > 10 && q.includes('?'));

            if (extractedQuestions.length === 0) {
                alert("Could not detect any valid questions (ending in '?') in this PDF.");
                setUploadingPdf(false);
                return;
            }

            // Save to Supabase
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase.from('question_banks').insert({
                title: file.name.replace('.pdf', ''),
                questions: extractedQuestions,
                created_by: user.id
            });

            if (error) throw error;

            alert(`Successfully extracted ${extractedQuestions.length} questions!`);
            loadDashboardData(); // Refresh list

        } catch (error: any) {
            alert(`Error parsing PDF: ${error.message}`);
        } finally {
            setUploadingPdf(false);
            e.target.value = ''; // Reset input
        }
    };

    const handleScheduleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setScheduling(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Combine date and time
            const startDateTimeObj = new Date(`${scheduleDate}T${startTime}`);
            const endDateTimeObj = new Date(`${scheduleDate}T${endTime}`);

            if (startDateTimeObj >= endDateTimeObj) {
                throw new Error("End time must be after start time.");
            }

            const startDateTime = startDateTimeObj.toISOString();
            const endDateTime = endDateTimeObj.toISOString();

            const payload: any = {
                student_id: selectedStudent,
                start_time: startDateTime,
                end_time: endDateTime,
                interview_type: interviewType,
                status: 'pending' // Reset to pending on every save/update
            };

            // Only include created_by on initial insert
            if (!editingId) {
                payload.created_by = user.id;
            }

            if (selectedBankId) {
                payload.question_bank_id = selectedBankId;
            } else {
                payload.question_bank_id = null; // Clear if set to default
            }

            let error;
            if (editingId) {
                const { data: updateData, error: updateError } = await supabase
                    .from('scheduled_interviews')
                    .update(payload)
                    .eq('id', editingId)
                    .select();

                error = updateError;

                if (!error && (!updateData || updateData.length === 0)) {
                    throw new Error("Update failed: Could not find a matching schedule record with ID " + editingId);
                }
            } else {
                const { data: insertData, error: insertError } = await supabase
                    .from('scheduled_interviews')
                    .insert(payload)
                    .select();

                error = insertError;
            }

            if (error) {
                alert(`Error: ${error.message}`);
            } else {
                alert(editingId ? "Schedule updated successfully!" : "Interview scheduled successfully!");
                resetForm();
                await loadDashboardData(); // Refresh table
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setScheduling(false);
        }
    };

    const handleEditClick = (s: ScheduledInterview) => {
        setEditingId(s.id);
        setSelectedStudent(s.student_id);
        setInterviewType(s.interview_type || 'official');
        setSelectedBankId(s.question_bank_id || '');

        const start = new Date(s.start_time);
        const end = new Date(s.end_time);

        // Use local date parts to avoid UTC shifting
        const year = start.getFullYear();
        const month = String(start.getMonth() + 1).padStart(2, '0');
        const day = String(start.getDate()).padStart(2, '0');
        setScheduleDate(`${year}-${month}-${day}`);

        const hours = String(start.getHours()).padStart(2, '0');
        const mins = String(start.getMinutes()).padStart(2, '0');
        setStartTime(`${hours}:${mins}`);

        const endHours = String(end.getHours()).padStart(2, '0');
        const endMins = String(end.getMinutes()).padStart(2, '0');
        setEndTime(`${endHours}:${endMins}`);

        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setEditingId(null);
        setSelectedStudent('');
        setScheduleDate('');
        setStartTime('');
        setEndTime('');
        setInterviewType('official');
        setSelectedBankId('');
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface-900 text-slate-200 bg-fixed">
            {/* Background Effects */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-900/20 rounded-full blur-[120px]" />
            </div>

            {/* Admin Nav */}
            <nav className="border-b border-surface-700/50 bg-surface-800/80 backdrop-blur-xl p-4 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-xl shadow-lg shadow-primary-500/20">
                            🛡️
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white leading-tight">Admin Portal</h1>
                            <p className="text-xs text-slate-400">VisaPrep AI Dashboard</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="px-4 py-2 rounded-lg bg-surface-700 hover:bg-surface-600 border border-surface-600 text-sm font-medium text-slate-300 hover:text-white transition-all shadow-sm"
                    >
                        Sign Out
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">

                {/* LEFT COL: upload & Scheduling */}
                <div className="lg:col-span-1 space-y-6">

                    {/* Upload PDF Panel */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="glass p-6 rounded-3xl border border-surface-600/50 shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-success-500 to-accent-500" />

                        <div className="mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <span>📚</span> Question Banks
                            </h2>
                            <p className="text-xs text-slate-400 mt-1">Upload a PDF to extract interview questions.</p>
                        </div>

                        <div className="relative">
                            <input
                                type="file"
                                accept="application/pdf"
                                onChange={handleFileUpload}
                                disabled={uploadingPdf}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className={`w-full border-2 border-dashed ${uploadingPdf ? 'border-primary-500 bg-primary-500/10' : 'border-surface-600 bg-surface-800/50 hover:bg-surface-700/50'} rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center gap-2`}>
                                {uploadingPdf ? (
                                    <>
                                        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                                        <span className="text-sm font-medium text-primary-400">Extracting questions...</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-10 h-10 rounded-full bg-surface-700 flex items-center justify-center text-xl shadow-inner mb-1">
                                            📄
                                        </div>
                                        <span className="text-sm font-bold text-slate-300">Click to upload PDF</span>
                                        <span className="text-xs text-slate-500">Only questions ending in '?' are saved</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {questionBanks.length > 0 && (
                            <div className="mt-4">
                                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Available Banks</h3>
                                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                    {questionBanks.map(qb => (
                                        <div key={qb.id} className="bg-surface-800/80 border border-surface-700 rounded-lg p-2.5 flex justify-between items-center">
                                            <span className="text-sm text-slate-200 font-medium truncate pr-2">{qb.title}</span>
                                            <span className="text-xs font-bold bg-surface-700 px-2 py-0.5 rounded-full text-slate-400 border border-surface-600">
                                                {qb.questions.length} Qs
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>


                    <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="glass p-6 rounded-3xl border border-surface-600/50 shadow-2xl relative overflow-hidden"
                    >
                        {/* Decorative gradient line */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-accent-500" />

                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <span>{editingId ? '✏️' : '📅'}</span> {editingId ? 'Edit Schedule' : 'Schedule Session'}
                            </h2>
                            <p className="text-sm text-slate-400 mt-1">
                                {editingId ? 'Modify the existing interview window.' : 'Generate a time-locked access link for a student.'}
                            </p>
                        </div>

                        <form onSubmit={handleScheduleSubmit} className="space-y-4">
                            {/* ... (form fields remain identical) ... */}
                            {/* (I will replace the whole form block to ensure no mistakes in nesting) */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider pl-1">Select Student</label>
                                <div className="relative">
                                    <select
                                        required
                                        value={selectedStudent}
                                        onChange={(e) => setSelectedStudent(e.target.value)}
                                        className="w-full bg-surface-800/80 border border-surface-600 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none transition-all shadow-inner"
                                    >
                                        <option value="" disabled>-- Choose a student --</option>
                                        {profiles.map(p => (
                                            <option key={p.id} value={p.id}>{p.email}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                                        ▼
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider pl-1">Interview Type</label>
                                    <div className="relative">
                                        <select
                                            value={interviewType}
                                            onChange={(e) => setInterviewType(e.target.value)}
                                            className="w-full bg-surface-800/80 border border-surface-600 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none transition-all shadow-inner"
                                        >
                                            <option value="official">Official</option>
                                            <option value="demo">Demo</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider pl-1">Question Bank</label>
                                    <div className="relative">
                                        <select
                                            value={selectedBankId}
                                            onChange={(e) => setSelectedBankId(e.target.value)}
                                            className="w-full bg-surface-800/80 border border-surface-600 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none transition-all shadow-inner"
                                        >
                                            <option value="">-- Default Pool --</option>
                                            {questionBanks.map(qb => (
                                                <option key={qb.id} value={qb.id}>{qb.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5 pt-1">
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider pl-1">Date</label>
                                <input
                                    type="date" required
                                    value={scheduleDate}
                                    onChange={(e) => setScheduleDate(e.target.value)}
                                    className="w-full bg-surface-800/80 border border-surface-600 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all shadow-inner"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider pl-1">Start Time</label>
                                    <input
                                        type="time" required
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full bg-surface-800/80 border border-surface-600 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all shadow-inner"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider pl-1">End Time</label>
                                    <input
                                        type="time" required
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full bg-surface-800/80 border border-surface-600 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all shadow-inner"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-4">
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="flex-1 px-4 py-3.5 rounded-xl text-sm font-bold bg-surface-700 hover:bg-surface-600 text-slate-300 transition-all border border-surface-600"
                                    >
                                        Cancel
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={scheduling}
                                    className="flex-[2] btn-primary py-3.5 rounded-xl text-sm font-bold shadow-lg shadow-primary-500/25 flex justify-center items-center gap-2"
                                >
                                    {scheduling ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            {editingId ? 'Updating...' : 'Scheduling...'}
                                        </>
                                    ) : (
                                        <>
                                            <span>{editingId ? '💾' : '✨'}</span> {editingId ? 'Update Schedule' : 'Create Access Link'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>

                {/* RIGHT COL: Data Tables */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Active Schedules Table */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="glass p-6 rounded-3xl border border-surface-600/50 shadow-xl"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="text-primary-400">⏱️</span> Active Schedules
                            </h2>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={loadDashboardData}
                                    className="px-3 py-1 rounded-lg bg-surface-800 hover:bg-surface-700 text-xs font-medium text-slate-400 hover:text-white border border-surface-700 transition-all flex items-center gap-2"
                                >
                                    <span>🔄</span> Refresh
                                </button>
                                <span className="bg-surface-800 px-3 py-1 rounded-full text-xs font-medium text-slate-300 border border-surface-600">
                                    {schedules.length} Total
                                </span>
                            </div>
                        </div>

                        <div className="bg-surface-900/50 rounded-2xl border border-surface-700/50 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="text-xs text-slate-400 uppercase bg-surface-800/50 border-b border-surface-700">
                                        <tr>
                                            <th className="px-5 py-4 font-semibold tracking-wider">Student</th>
                                            <th className="px-5 py-4 font-semibold tracking-wider">Type</th>
                                            <th className="px-5 py-4 font-semibold tracking-wider">Question Bank</th>
                                            <th className="px-5 py-4 font-semibold tracking-wider">Date</th>
                                            <th className="px-5 py-4 font-semibold tracking-wider">Time Window</th>
                                            <th className="px-5 py-4 font-semibold tracking-wider">Status</th>
                                            <th className="px-5 py-4 font-semibold tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-surface-700/50">
                                        {schedules.length === 0 ? (
                                            <tr><td colSpan={7} className="py-8 text-center text-slate-500">No interviews scheduled yet.</td></tr>
                                        ) : schedules.map((s, idx) => (
                                            <tr key={s.id} className={idx % 2 === 0 ? 'bg-transparent' : 'bg-surface-800/20'}>
                                                <td className="px-5 py-4 font-medium text-slate-200">{s.student_email}</td>
                                                <td className="px-5 py-4 text-xs font-semibold">
                                                    <span className={s.interview_type === 'official' ? 'text-primary-400' : 'text-accent-400'}>
                                                        {s.interview_type?.toUpperCase() || 'OFFICIAL'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-slate-400 text-xs">
                                                    {questionBanks.find(b => b.id === s.question_bank_id)?.title || 'Default Pool'}
                                                </td>
                                                <td className="px-5 py-4 text-slate-400">{new Date(s.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                                                <td className="px-5 py-4 text-slate-400 font-mono text-xs">
                                                    {new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-wide ${s.status === 'completed' ? 'bg-accent-500/10 text-accent-400 border border-accent-500/20' :
                                                        s.status === 'pending' ? 'bg-warning-500/10 text-warning-400 border border-warning-500/20' :
                                                            'bg-danger-500/10 text-danger-400 border border-danger-500/20'
                                                        }`}>
                                                        {s.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <button
                                                        onClick={() => handleEditClick(s)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${editingId === s.id
                                                            ? 'bg-primary-500 text-white border-primary-400 shadow-lg shadow-primary-500/20'
                                                            : 'bg-surface-800 hover:bg-surface-700 text-slate-300 border-surface-600 hover:border-slate-500'}`}
                                                    >
                                                        {editingId === s.id ? 'Editing...' : '✏️ Edit'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>

                    {/* Results Table */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="glass p-6 rounded-3xl border border-surface-600/50 shadow-xl"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="text-secondary-400">📊</span> Completed Results
                            </h2>
                            <span className="bg-surface-800 px-3 py-1 rounded-full text-xs font-medium text-slate-300 border border-surface-600">
                                {results.length} Sessions
                            </span>
                        </div>

                        <div className="bg-surface-900/50 rounded-2xl border border-surface-700/50 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="text-xs text-slate-400 uppercase bg-surface-800/50 border-b border-surface-700">
                                        <tr>
                                            <th className="px-5 py-4 font-semibold tracking-wider">Student</th>
                                            <th className="px-5 py-4 font-semibold tracking-wider">Completed On</th>
                                            <th className="px-5 py-4 font-semibold tracking-wider">AI Score</th>
                                            <th className="px-5 py-4 font-semibold tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-surface-700/50">
                                        {results.length === 0 ? (
                                            <tr><td colSpan={4} className="py-8 text-center text-slate-500">No results available yet.</td></tr>
                                        ) : results.map((r, idx) => (
                                            <tr key={r.id} className={idx % 2 === 0 ? 'bg-transparent' : 'bg-surface-800/20'}>
                                                <td className="px-5 py-4 font-medium text-slate-200">{r.user_email}</td>
                                                <td className="px-5 py-4 text-slate-400">{new Date(r.end_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${r.final_score >= 8 ? 'bg-accent-500/10 text-accent-400 border border-accent-500/20' :
                                                            r.final_score >= 5 ? 'bg-warning-500/10 text-warning-400 border border-warning-500/20' :
                                                                'bg-danger-500/10 text-danger-400 border border-danger-500/20'
                                                            }`}>
                                                            {r.final_score}/10
                                                        </span>
                                                        {/* Visual bar indicator */}
                                                        <div className="w-16 h-1.5 bg-surface-700 rounded-full overflow-hidden hidden sm:block">
                                                            <div
                                                                className={`h-full ${r.final_score >= 8 ? 'bg-accent-500' : r.final_score >= 5 ? 'bg-warning-500' : 'bg-danger-500'}`}
                                                                style={{ width: `${(r.final_score / 10) * 100}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <button
                                                        onClick={() => router.push(`/interview/result/${r.id}`)}
                                                        className="px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-primary-600/20 text-primary-400 hover:text-primary-300 border border-surface-600 hover:border-primary-500/50 text-xs font-semibold transition-all"
                                                    >
                                                        View Report →
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>

                </div>
            </main>
        </div>
    );
}
