'use client';

import { useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  DEFAULT_ELO_CONFIG,
  DEFAULT_ELO_SCALE,
  DEFAULT_K_FACTOR,
  type EloConfig,
} from '@/lib/rating-elo';
import { cn } from '@/lib/utils';

const MIN_K_FACTOR = 8;
const MAX_K_FACTOR = 64;
const K_STEP = 1;

const MIN_ELO_SCALE = 200;
const MAX_ELO_SCALE = 800;
const ELO_SCALE_STEP = 10;

type EloConfigPopoverProps = {
  eloConfig: EloConfig;
  onEloConfigCommit: (value: EloConfig) => void;
};

function isDefaultEloConfig(config: EloConfig): boolean {
  return config.kFactor === DEFAULT_K_FACTOR && config.eloScale === DEFAULT_ELO_SCALE;
}

export function EloConfigPopover({ eloConfig, onEloConfigCommit }: EloConfigPopoverProps) {
  const [draftKFactor, setDraftKFactor] = useState(eloConfig.kFactor);
  const [draftEloScale, setDraftEloScale] = useState(eloConfig.eloScale);
  const [labelsPulse, setLabelsPulse] = useState(false);

  useEffect(() => {
    setDraftKFactor(eloConfig.kFactor);
    setDraftEloScale(eloConfig.eloScale);
  }, [eloConfig]);

  const isNonDefault = !isDefaultEloConfig(eloConfig);

  const commitConfig = (kFactor: number, eloScale: number) => {
    onEloConfigCommit({ kFactor, eloScale });
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
        className="w-72 min-w-[260px] border-l-2 border-l-accent/80 p-4"
      >
        <p className="font-headline text-sm font-semibold tracking-tight">Elo parameters</p>

        <div
          aria-live="polite"
          className={cn(
            'mt-3 flex items-center justify-between gap-2 transition-opacity duration-150',
            labelsPulse && 'opacity-60'
          )}
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">K factor</span>
            <span className="font-mono text-sm tabular-nums">{draftKFactor}</span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xs text-muted-foreground">Elo scale</span>
            <span className="font-mono text-sm tabular-nums">{draftEloScale}</span>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor="elo-k-factor-slider" className="text-xs text-muted-foreground">
            K factor — rating change speed
          </Label>
          <Slider
            id="elo-k-factor-slider"
            min={MIN_K_FACTOR}
            max={MAX_K_FACTOR}
            step={K_STEP}
            value={[draftKFactor]}
            onValueChange={([value]) => setDraftKFactor(value)}
            onValueCommit={([value]) => commitConfig(value, draftEloScale)}
            aria-label="K factor"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{MIN_K_FACTOR}</span>
            <span>{MAX_K_FACTOR}</span>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor="elo-scale-slider" className="text-xs text-muted-foreground">
            Elo scale — expected win sensitivity
          </Label>
          <Slider
            id="elo-scale-slider"
            min={MIN_ELO_SCALE}
            max={MAX_ELO_SCALE}
            step={ELO_SCALE_STEP}
            value={[draftEloScale]}
            onValueChange={([value]) => setDraftEloScale(value)}
            onValueCommit={([value]) => commitConfig(draftKFactor, value)}
            aria-label="Elo scale"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{MIN_ELO_SCALE}</span>
            <span>{MAX_ELO_SCALE}</span>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Default: K {DEFAULT_ELO_CONFIG.kFactor}, scale {DEFAULT_ELO_CONFIG.eloScale}
        </p>
        <p className="mt-1 text-xs italic text-muted-foreground">Resets on page reload</p>
      </PopoverContent>
    </Popover>
  );
}
