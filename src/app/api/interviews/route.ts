import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { total_questions } = body;

        const { data, error } = await supabase
            .from('interviews')
            .insert({
                user_id: user.id,
                start_time: new Date().toISOString(),
                total_questions: total_questions || 10,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ interview: data });
    } catch (error) {
        console.error('Create interview error:', error);
        return NextResponse.json({ error: 'Failed to create interview' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { interview_id, final_score } = body;

        const { data, error } = await supabase
            .from('interviews')
            .update({
                end_time: new Date().toISOString(),
                final_score: final_score,
            })
            .eq('id', interview_id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ interview: data });
    } catch (error) {
        console.error('Update interview error:', error);
        return NextResponse.json({ error: 'Failed to update interview' }, { status: 500 });
    }
}
