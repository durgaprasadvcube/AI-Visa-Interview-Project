import { NextRequest, NextResponse } from 'next/server';
import { evaluateAnswer } from '@/lib/gemini';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { question, transcript } = body;

        if (!question || !transcript) {
            return NextResponse.json(
                { error: 'Question and transcript are required' },
                { status: 400 }
            );
        }

        if (transcript.trim().length < 5) {
            return NextResponse.json({
                score: 1,
                strengths: [],
                weaknesses: ['No meaningful answer was given'],
                suggestions: ['Please speak clearly and answer the question fully'],
                summary: 'No substantial answer detected.',
            });
        }

        const evaluation = await evaluateAnswer(question, transcript);
        return NextResponse.json(evaluation);
    } catch (error) {
        console.error('Evaluate route error:', error);
        return NextResponse.json(
            {
                score: 5,
                strengths: ['Answer captured'],
                weaknesses: ['Evaluation service unavailable'],
                suggestions: ['Ensure GEMINI_API_KEY is configured correctly'],
                summary: 'Evaluation service unavailable.',
            },
            { status: 200 }
        );
    }
}
