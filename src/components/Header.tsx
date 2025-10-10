import Link from 'next/link';
import { Button } from './ui/button';
import { Logo } from './Logo';
import { Shield } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Logo />
            <span className="hidden font-bold sm:inline-block font-headline">
              CS2 Rank Tracker
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
            <Button asChild variant="ghost">
                <Link href="/admin/login">
                    <Shield className="mr-2 h-4 w-4" />
                    Admin Panel
                </Link>
            </Button>
        </div>
      </div>
    </header>
  );
}
