import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'AI Visa Interview Simulator | Practice Your Study Visa Interview',
    description:
        'Prepare for your study visa interview with AI-powered question practice, real-time speech recognition, face monitoring, and personalized feedback. Build confidence before the real interview.',
    keywords: 'visa interview, study visa, AI interview practice, visa preparation, student visa',
    openGraph: {
        title: 'AI Visa Interview Simulator',
        description: 'Ace your study visa interview with AI-powered practice sessions',
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
