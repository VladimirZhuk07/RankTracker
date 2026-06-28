'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DEFAULT_ELO_SCALE,
  DEFAULT_K_FACTOR,
  INITIAL_RATING,
} from '@/lib/rating-elo';
import { getRatingRulesText } from '@/lib/rating-i18n';

function FormulaBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-md border border-border/60 bg-muted/50 p-4 font-mono text-xs leading-relaxed text-foreground sm:text-sm">
      {children}
    </pre>
  );
}

export default function RatingRulesPage() {
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setLocale(navigator.language);
    }
  }, []);

  const t = useMemo(() => getRatingRulesText(locale), [locale]);

  const eloFormula = useMemo(
    () =>
      `expected = 1 / (1 + 10^((oppTeamAvg - myTeamAvg) / ${DEFAULT_ELO_SCALE}))
actual   = 1 if won else 0
rating  += K × (actual - expected)

defaults: start ${INITIAL_RATING}, K = ${DEFAULT_K_FACTOR}, scale = ${DEFAULT_ELO_SCALE}`,
    []
  );

  const displayStatsFormula = useMemo(
    () =>
      `kdRatio       = totalKills / totalDeaths   (or totalKills if no deaths)
averageDamage = totalDamage / totalMaps`,
    []
  );

  return (
    <div className="container w-full max-w-3xl py-6">
      <div className="mb-6 space-y-2">
        <h1 className="font-headline text-2xl font-bold tracking-tight sm:text-3xl">{t.heroTitle}</h1>
        <p className="text-muted-foreground">
          {t.introBeforeStrong}
          <strong className="text-foreground">{t.introStrong}</strong>
          {t.introAfterStrong}
          <code className="rounded bg-muted px-1 py-0.5 text-sm">{t.codeLabel}</code>
          {t.introAfterCode}
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t.overviewTitle}</CardTitle>
            <CardDescription>{t.overviewDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>
                <span className="text-foreground">{t.overviewItem1Label}</span>
                {t.overviewItem1Rest}
              </li>
              <li>
                <span className="text-foreground">{t.overviewItem2Label}</span>
                {t.overviewItem2Rest}
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.mapCountTitle}</CardTitle>
            <CardDescription>{t.mapCountDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>{t.mapCountBullet1}</li>
              <li>{t.mapCountBullet2}</li>
              <li>{t.mapCountBullet3}</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.eloFormulaTitle}</CardTitle>
            <CardDescription>{t.eloFormulaDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormulaBlock>{eloFormula}</FormulaBlock>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.equalTeamsTitle}</CardTitle>
            <CardDescription>{t.equalTeamsDescription}</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.neutralTitle}</CardTitle>
            <CardDescription>{t.neutralDescription}</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.displayStatsTitle}</CardTitle>
            <CardDescription>{t.displayStatsDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormulaBlock>{displayStatsFormula}</FormulaBlock>
            <p className="text-sm text-muted-foreground">{t.displayStatsFootnote}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.deltaTitle}</CardTitle>
            <CardDescription>{t.deltaDescription}</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.typicalRangeTitle}</CardTitle>
            <CardDescription>{t.typicalRangeDescription}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
