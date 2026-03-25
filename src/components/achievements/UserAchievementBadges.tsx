'use client';

import type { AchievementResult } from '@/lib/achievements';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Trophy } from 'lucide-react';

const AVATAR_SIZE = 40;
const POPOVER_ICON_SIZE = AVATAR_SIZE * 3;

function AchievementIcon({
  achievement,
  size,
  className,
}: {
  achievement: AchievementResult;
  size: number;
  className?: string;
}) {
  const src = `/achievements/${achievement.iconPath}`;
  return (
    <img
      src={src}
      alt={achievement.name}
      width={size}
      height={size}
      className={cn('rounded object-contain shrink-0', className)}
    />
  );
}

export function UserAchievementBadges({
  achievements,
  containerClassName,
}: {
  achievements: AchievementResult[];
  containerClassName?: string;
}) {
  if (achievements.length === 0) return null;

  return (
    <div
      className={cn('achievementsBadges', containerClassName)}
      role="list"
      aria-label="Achievements"
    >
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 md:h-8 md:w-8"
            aria-label="View all achievements"
            onClick={(e) => e.stopPropagation()}
          >
            <Trophy className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 max-h-[70vh] overflow-y-auto" align="end">
          <div className="grid gap-4">
            <h4 className="font-medium leading-none">All achievements</h4>
            <ul className="space-y-3">
              {achievements.map((a) => (
                <li key={a.id} className="flex items-center gap-3">
                  <div
                    className="flex shrink-0 items-center justify-center"
                    style={{ width: POPOVER_ICON_SIZE, height: POPOVER_ICON_SIZE }}
                  >
                    <AchievementIcon achievement={a} size={POPOVER_ICON_SIZE} className="rounded" />
                  </div>
                  <div className="min-w-0 space-y-0.5 flex-1">
                    <p className="font-medium text-sm">{a.name}</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-line">{a.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
