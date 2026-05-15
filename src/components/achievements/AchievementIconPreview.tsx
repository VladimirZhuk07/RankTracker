'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const PREVIEW_MAX_SIZE = 320;

export function getAchievementIconSrc(iconPath: string): string {
  return `/achievements/${iconPath}`;
}

export function AchievementIconPreview({
  iconPath,
  name,
  description,
  size,
  className,
  imageClassName,
}: {
  iconPath: string;
  name: string;
  description?: string;
  size: number;
  className?: string;
  imageClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const src = getAchievementIconSrc(iconPath);

  return (
    <>
      <button
        type="button"
        className={cn(
          'flex shrink-0 cursor-zoom-in items-center justify-center rounded transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
          className
        )}
        style={{ width: size, height: size }}
        aria-label={`View larger ${name} achievement icon`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          className={cn('pointer-events-none rounded object-contain', imageClassName)}
        />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-sm sm:max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
            {description ? (
              <DialogDescription className="whitespace-pre-line text-left">
                {description}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <div
            className="mx-auto flex items-center justify-center"
            style={{ width: PREVIEW_MAX_SIZE, height: PREVIEW_MAX_SIZE, maxWidth: 'min(90vw, 20rem)' }}
          >
            <img
              src={src}
              alt={name}
              width={PREVIEW_MAX_SIZE}
              height={PREVIEW_MAX_SIZE}
              className="max-h-[min(70vh,20rem)] w-full object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
