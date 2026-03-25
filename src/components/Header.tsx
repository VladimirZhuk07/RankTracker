import Link from 'next/link';
import { Logo } from './Logo';
import { HeaderNav } from './HeaderNav';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex min-w-0">
          <Link href="/" className="mr-6 flex min-w-0 items-center space-x-2">
            <Logo />
            <span className="hidden font-bold sm:inline-block font-headline">
              CS2 Rank Tracker
            </span>
          </Link>
        </div>
        <HeaderNav />
      </div>
    </header>
  );
}
