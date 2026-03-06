import { SAMPLE_VISA_QUESTIONS, VisaQuestion } from '@/data/sample-questions';

/**
 * Parse questions from raw PDF text
 * Looks for numbered lines (e.g., "1. Why did you choose...")
 */
export function parseQuestionsFromText(text: string): VisaQuestion[] {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const questions: VisaQuestion[] = [];

    let id = 1;
    const questionRegex = /^(\d+[\.\)]\s+)(.+\?)$/;

    for (const line of lines) {
        const match = line.match(questionRegex);
        if (match) {
            questions.push({
                id: id++,
                category: 'General',
                question: match[2].trim(),
                tips: 'Take your time and speak clearly.',
                timeSeconds: 40,
            });
        } else if (line.endsWith('?') && line.length > 20) {
            // Also capture plain lines ending with ?
            questions.push({
                id: id++,
                category: 'General',
                question: line,
                tips: 'Take your time and speak clearly.',
                timeSeconds: 40,
            });
        }
    }

    return questions.length >= 3 ? questions : SAMPLE_VISA_QUESTIONS;
}

/**
 * Get the current question bank
 * In production, this could read from Supabase storage
 */
export function getDefaultQuestions(): VisaQuestion[] {
    return SAMPLE_VISA_QUESTIONS;
}
