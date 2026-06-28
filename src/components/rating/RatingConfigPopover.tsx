'use client';

import { useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DEFAULT_WIN_PCT, formatWinLossPct } from '@/lib/rating-modifiers';
import { cn } from '@/lib/utils';

const MIN_WIN_PCT = 1;
const MAX_WIN_PCT = 99;
const SLIDER_STEP = 0.1;

type RatingConfigPopoverProps = {
  winPct: number;
  onWinPctCommit: (value: number) => void;
};

export function RatingConfigPopover({ winPct, onWinPctCommit }: RatingConfigPopoverProps) {
  const [draftWinPct, setDraftWinPct] = useState(winPct);
  const [labelsPulse, setLabelsPulse] = useState(false);

  useEffect(() => {
    setDraftWinPct(winPct);
  }, [winPct]);

  const { winLabel, lossLabel } = formatWinLossPct(draftWinPct);
  const isNonDefault = winPct !== DEFAULT_WIN_PCT;

  const handleValueCommit = (value: number) => {
    onWinPctCommit(value);
    setLabelsPulse(true);
    window.setTimeout(() => setLabelsPulse(false), 150);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative h-7 w-7 shrink-0 text-muted-foreground hover:bg-accent/10 hover:text-accent"
          aria-label="Rating parameters"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {isNonDefault ? (
            <span
              aria-hidden
              className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-accent"
            />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-64 min-w-[240px] border-l-2 border-l-accent/80 p-4"
      >
        <p className="font-headline text-sm font-semibold tracking-tight">Match outcome weight</p>

        <div
          aria-live="polite"
          className={cn(
            'mt-3 flex items-center justify-between gap-2 transition-opacity duration-150',
            labelsPulse && 'opacity-60'
          )}
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Win</span>
            <span className="font-mono text-sm tabular-nums text-emerald-600 dark:text-emerald-500">
              {winLabel}
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xs text-muted-foreground">Loss</span>
            <span className="font-mono text-sm tabular-nums text-red-600 dark:text-red-400">
              {lossLabel}
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor="rating-win-pct-slider" className="sr-only">
            Match outcome weight percentage
          </Label>
          <Slider
            id="rating-win-pct-slider"
            min={MIN_WIN_PCT}
            max={MAX_WIN_PCT}
            step={SLIDER_STEP}
            value={[draftWinPct]}
            onValueChange={([value]) => setDraftWinPct(value)}
            onValueCommit={([value]) => handleValueCommit(value)}
            aria-label="Win and loss percentage"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{MIN_WIN_PCT}%</span>
            <span>{MAX_WIN_PCT}%</span>
          </div>
        </div>

        <p className="mt-3 text-xs italic text-muted-foreground">Resets on page reload</p>
      </PopoverContent>
    </Popover>
  );
}
