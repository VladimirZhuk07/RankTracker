'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { calculateWinModifier, MAX_RAW_RATING } from '@/lib/calculations';
import { getRatingRulesText } from '@/lib/rating-i18n';

const winMod = calculateWinModifier(true);
const lossMod = calculateWinModifier(false);

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

  const winPct = Math.round((winMod - 1) * 100);
  const lossPct = Math.round((1 - lossMod) * 100);

  const aggregationFormula = useMemo(
    () =>
      `effectiveKills  += kills  × modifier
effectiveDeaths += deaths
effectiveDamage += damage × modifier
totalMaps       += 1

kdRatio       = effectiveKills / effectiveDeaths   ${t.aggregationFormulaComment}
averageDamage = effectiveDamage / totalMaps

rawRating = kdRatio × 2 + averageDamage / 100`,
    [t.aggregationFormulaComment]
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
            <CardTitle>{t.winLossTitle}</CardTitle>
            <CardDescription>{t.winLossDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormulaBlock>
              {`if sessionHasWinner:
  modifier = won ? ${winMod} : ${lossMod}
else:
  modifier = 1.0`}
            </FormulaBlock>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>
                {t.winBulletPrefix}
                <span className="text-foreground">{winMod}×</span>
                {t.winBulletMiddle}
                {winPct}
                {t.winBulletSuffix}
              </li>
              <li>
                {t.lossBulletPrefix}
                <span className="text-foreground">{lossMod}×</span>
                {t.lossBulletMiddle}
                {lossPct}
                {t.lossBulletSuffix}
              </li>
              <li>
                {t.neutralBulletPrefix}
                <span className="text-foreground">1.0×</span>
                {t.neutralBulletSuffix}
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.aggregationTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormulaBlock>{aggregationFormula}</FormulaBlock>
            <p className="text-sm text-muted-foreground">{t.aggregationFootnote}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.normalizationTitle}</CardTitle>
            <CardDescription>
              {t.normalizationDescriptionBefore}
              <code className="rounded bg-muted px-1 py-0.5 text-sm">
                MAX_RAW_RATING ≈ {MAX_RAW_RATING}
              </code>
              {t.normalizationDescriptionAfter}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormulaBlock>{`normalizedRating = (rawRating / ${MAX_RAW_RATING}) × 100
finalRating = min(100, normalizedRating)`}</FormulaBlock>
            <p className="text-sm text-muted-foreground">{t.normalizationFootnote}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
