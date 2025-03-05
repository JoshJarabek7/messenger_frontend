import Link from 'next/link';

import { ThemeSwitcher } from '@/components/theme-switcher';

export default async function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background sticky top-0 z-30">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center">
            <h1 className="text-xl font-bold">ChatGenius</h1>
          </Link>
          <ThemeSwitcher />
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center py-10 px-4">
        <div className="w-full max-w-md mx-auto">{children}</div>
      </main>
      <footer className="border-t py-4">
        <div className="container flex justify-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} ChatGenius. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
