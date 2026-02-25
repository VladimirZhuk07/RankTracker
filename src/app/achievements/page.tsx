'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  ALL_ACHIEVEMENTS_INFO,
  getAchievementText,
  getPageText,
  type AchievementInfo,
} from '@/lib/achievements-i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const POPOVER_ICON_SIZE = 120;

function AchievementRow({
  achievement,
  locale,
}: {
  achievement: AchievementInfo;
  locale: string;
}) {
  const { name, description } = useMemo(
    () => getAchievementText(achievement, locale),
    [achievement, locale]
  );
  return (
    <li className="flex items-center gap-4 border-b border-border/40 py-4 last:border-0">
      <div
        className="flex shrink-0 items-center justify-center"
        style={{ width: POPOVER_ICON_SIZE, height: POPOVER_ICON_SIZE }}
      >
        <img
          src={`/achievements/${achievement.iconPath}`}
          alt={name}
          width={POPOVER_ICON_SIZE}
          height={POPOVER_ICON_SIZE}
          className="rounded object-contain"
        />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium">{name}</p>
        <p className="text-sm text-muted-foreground whitespace-pre-line">
          {description}
        </p>
      </div>
    </li>
  );
}

export default function AchievementsPage() {
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setLocale(navigator.language);
    }
  }, []);

  const pageText = useMemo(() => getPageText(locale), [locale]);

  return (
    <div className="container max-w-2xl py-6">
      <Card>
        <CardHeader>
          <CardTitle>{pageText.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y-0">
            {ALL_ACHIEVEMENTS_INFO.map((achievement) => (
              <AchievementRow
                key={achievement.id}
                achievement={achievement}
                locale={locale}
              />
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
