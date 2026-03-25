'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import { Calculator, Menu, Shield, Trophy } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function HeaderNav() {
  return (
    <div className="flex flex-1 items-center justify-end space-x-2">
      {/* Desktop: same layout as original header — three ghost links in a row */}
      <nav
        className="hidden items-center space-x-2 md:flex"
        aria-label="Main"
      >
        <Button asChild variant="ghost">
          <Link href="/achievements">
            <Trophy className="mr-2 h-4 w-4" />
            Achievements
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/rating">
            <Calculator className="mr-2 h-4 w-4" />
            Rating rules
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/admin/login">
            <Shield className="mr-2 h-4 w-4" />
            Admin Panel
          </Link>
        </Button>
      </nav>

      {/* Narrow viewports only: menu icon + vertical list */}
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-52">
            <DropdownMenuItem asChild>
              <Link href="/achievements" className="cursor-pointer">
                <Trophy className="h-4 w-4" />
                Achievements
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/rating" className="cursor-pointer">
                <Calculator className="h-4 w-4" />
                Rating rules
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/login" className="cursor-pointer">
                <Shield className="h-4 w-4" />
                Admin Panel
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
