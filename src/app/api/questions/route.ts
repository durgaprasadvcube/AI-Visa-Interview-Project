import { NextRequest, NextResponse } from 'next/server';
import { getDefaultQuestions } from '@/lib/questions';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(req.url);
        const interviewId = searchParams.get('interview_id');
        const isDemo = searchParams.get('is_demo') === 'true';

        let customQuestions: any[] = [];
        let useDefault = true;

        // Force the first specific questions
        const nameQuestion = {
            id: 'intro-0',
            category: 'Introduction',
            question: 'Could you please tell me your full name?',
            tips: 'Just state your name clearly.',
            timeSeconds: 30
        };

        const introQuestion = {
            id: 'intro-1',
            category: 'Introduction',
            question: '{greeting_placeholder}', // Replaced dynamically on frontend
            tips: 'Keep it brief, focusing on your background, education, and purpose of travel.',
            timeSeconds: 60
        };

        if (interviewId && !isDemo) {
            // Fetch scheduled interview to see if there is a question bank
            const { data: schedule } = await supabase
                .from('scheduled_interviews')
                .select('question_bank_id')
                .eq('id', interviewId)
                .single();

            if (schedule?.question_bank_id) {
                // Fetch the question bank
                const { data: bank } = await supabase
                    .from('question_banks')
                    .select('questions')
                    .eq('id', schedule.question_bank_id)
                    .single();

                if (bank && bank.questions && bank.questions.length > 0) {
                    customQuestions = bank.questions.map((q: string, idx: number) => ({
                        id: `custom-${idx}`,
                        category: 'Custom PDF Questions',
                        question: q,
                        tips: 'Answer clearly and confidently.',
                        timeSeconds: 45
                    }));
                    useDefault = false;
                }
            }
        }

        let finalQuestions = [];

        if (useDefault) {
            const allDefaults = getDefaultQuestions();
            if (isDemo) {
                // Return 3 shorter questions for demo
                finalQuestions = allDefaults.slice(0, 3);
            } else {
                finalQuestions = allDefaults;
            }
        } else {
            // Select up to 10 random custom questions to avoid an infinite interview
            const shuffled = customQuestions.sort(() => 0.5 - Math.random());
            finalQuestions = shuffled.slice(0, 10);
        }

        // Always prepend intro questions
        finalQuestions.unshift(introQuestion);
        finalQuestions.unshift(nameQuestion);

        return NextResponse.json({ questions: finalQuestions });

    } catch (error) {
        console.error('Questions route error:', error);
        return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 });
    }
}

