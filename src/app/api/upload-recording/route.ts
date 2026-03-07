import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

export const dynamic = 'force-dynamic';

function getDriveService() {
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    const credentials = {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
    };

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    return google.drive({ version: 'v3', auth });
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('video') as File;
        const interviewId = formData.get('interviewId') as string;

        if (!file) {
            return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
        }

        const drive = getDriveService();

        // Convert File to readable stream
        const buffer = await file.arrayBuffer();
        const stream = new Readable();
        stream.push(Buffer.from(buffer));
        stream.push(null);

        // Upload to Google Drive
        const fileMetadata = {
            name: `Interview_${interviewId || 'Recording'}_${Date.now()}.webm`,
            mimeType: file.type || 'video/webm',
        };
        const media = {
            mimeType: file.type || 'video/webm',
            body: stream,
        };

        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink',
        });

        const fileId = response.data.id;

        // Make the file publicly accessible so the admin can view it via the link
        if (fileId) {
            await drive.permissions.create({
                fileId: fileId,
                requestBody: {
                    role: 'reader',
                    type: 'anyone',
                },
            });
        }

        return NextResponse.json({
            success: true,
            fileId: fileId,
            url: response.data.webViewLink
        });

    } catch (error) {
        console.error('Google Drive Upload Error:', error);
        return NextResponse.json({ error: 'Failed to upload video recording' }, { status: 500 });
    }
}
