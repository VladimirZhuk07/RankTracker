import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import Link from 'next/link';
import { ArrowLeft, Calculator } from 'lucide-react';

export default function AchievementsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-50 flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b bg-background px-4 py-2 md:min-h-16 md:px-6 md:py-0">
        <nav className="flex min-w-0 flex-1 items-center text-lg font-medium md:flex-none md:text-sm">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 text-lg font-semibold md:text-base font-headline"
          >
            <Logo />
            <span className="hidden sm:inline-block">CS2 Rank Tracker</span>
          </Link>
        </nav>
        <div className="flex w-full flex-shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
          <Button asChild variant="outline">
            <Link href="/rating" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Rating rules
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Leaderboard
            </Link>
          </Button>
        </div>
      </header>
      <main className="flex w-full flex-1 flex-col items-center p-4 sm:px-6 sm:py-0 md:gap-8">
        {children}
      </main>
    </div>
  );
}
