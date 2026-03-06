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
        const { interview_id, alert_type } = body;

        if (!interview_id || !alert_type) {
            return NextResponse.json(
                { error: 'interview_id and alert_type are required' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('alerts')
            .insert({
                interview_id,
                alert_type,
                timestamp: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ alert: data });
    } catch (error) {
        console.error('Save alert error:', error);
        return NextResponse.json({ error: 'Failed to save alert' }, { status: 500 });
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
            .from('alerts')
            .select('*')
            .eq('interview_id', interview_id)
            .order('timestamp', { ascending: true });

        if (error) throw error;

        return NextResponse.json({ alerts: data });
    } catch (error) {
        console.error('Get alerts error:', error);
        return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
    }
}
