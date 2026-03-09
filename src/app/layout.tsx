import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Guideuni AI Interview | Master Your Study Visa Preparation',
    description:
        'Prepare for your study visa interview with Guideuni AI Interview. AI-powered question practice, real-time speech recognition, and personalized feedback to build your confidence.',
    keywords: 'Guideuni, visa interview, study visa, AI interview practice, visa preparation, student visa',
    openGraph: {
        title: 'Guideuni AI Interview',
        description: 'Ace your study visa interview with AI-powered practice sessions by Guideuni',
        type: 'website',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            </head>
            <body className="animated-bg min-h-screen">
                {children}
            </body>
        </html>
    );
}
