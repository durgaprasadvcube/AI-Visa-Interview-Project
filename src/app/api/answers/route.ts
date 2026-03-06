import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { interview_id, question, transcript, ai_score, feedback } = body;

        if (!interview_id || !question) {
            return NextResponse.json({ error: 'interview_id and question are required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('answers')
            .insert({
                interview_id,
                question,
                transcript: transcript || '',
                ai_score: ai_score || null,
                feedback: feedback || null,
                timestamp: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ answer: data });
    } catch (error) {
        console.error('Save answer error:', error);
        return NextResponse.json({ error: 'Failed to save answer' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const interview_id = searchParams.get('interview_id');

        if (!interview_id) {
            return NextResponse.json({ error: 'interview_id required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('answers')
            .select('*')
            .eq('interview_id', interview_id)
            .order('timestamp', { ascending: true });

        if (error) throw error;

        return NextResponse.json({ answers: data });
    } catch (error) {
        console.error('Get answers error:', error);
        return NextResponse.json({ error: 'Failed to fetch answers' }, { status: 500 });
    }
}
