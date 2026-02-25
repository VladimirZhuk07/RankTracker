import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AchievementsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <nav className="flex flex-col gap-6 text-lg font-medium md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold md:text-base font-headline"
          >
            <Logo />
            <span className="hidden sm:inline-block">CS2 Rank Tracker</span>
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Leaderboard
            </Link>
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">{children}</main>
    </div>
  );
}
