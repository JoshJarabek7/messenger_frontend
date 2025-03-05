import { Geist } from 'next/font/google';
import Script from 'next/script';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';

import { ThemeSwitcher } from '@/components/theme-switcher';

import './globals.css';

// Use NEXT_PUBLIC_APP_URL, falling back to Vercel URL or localhost
const defaultUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  'http://localhost:3000';

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: 'ChatGenius: AI-Enhanced Workplace Communication',
  description:
    "A Slack-like application with AI avatars to represent users when they're unavailable",
};

const geistSans = Geist({
  display: 'swap',
  subsets: ['latin'],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistSans.className} suppressHydrationWarning>
      <head>
        <Script id="user-status-tracker" strategy="beforeInteractive">
          {`
            window.addEventListener('beforeunload', async () => {
              try {
                // Only run if user is logged in
                const authData = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
                if (authData?.currentSession?.user?.id) {
                  const userId = authData.currentSession.user.id;
                  const baseUrl = window.location.origin;
                  
                  // Send status update using beacon API to ensure it completes
                  navigator.sendBeacon(
                    \`\${baseUrl}/api/user/status\`,
                    JSON.stringify({ status: 'offline', userId })
                  );
                }
              } catch (err) {
                console.error('Error updating status on page unload:', err);
              }
            });
          `}
        </Script>
      </head>
      <body className="bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <main className="min-h-screen">
            {children}
            <div className="hidden">
              <ThemeSwitcher />
            </div>
          </main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
