'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ADR_WEIGHT_IN_PERF,
  DEFAULT_ELO_SCALE,
  DEFAULT_K_FACTOR,
  DEFAULT_OUTCOME_WEIGHT_PCT,
  DEFAULT_SKILL_WEIGHT_PCT,
  INITIAL_RATING,
  KD_WEIGHT_IN_PERF,
} from '@/lib/rating-elo';
import { getRatingRulesText, type RatingRulesStrings } from '@/lib/rating-i18n';

function FormulaBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-md border border-border/60 bg-muted/50 p-4 font-mono text-xs leading-relaxed text-foreground sm:text-sm">
      {children}
    </pre>
  );
}

type ExampleTableProps = {
  headers: string[];
  rows: string[][];
};

function ExampleTable({ headers, rows }: ExampleTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[28rem] text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 text-left font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b last:border-b-0">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-3 py-2 font-mono tabular-nums text-muted-foreground last:font-sans"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatSigned(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return rounded >= 0 ? `+${rounded.toFixed(1)}` : rounded.toFixed(1);
}

export default function RatingRulesPage() {
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setLocale(navigator.language);
    }
  }, []);

  const t = useMemo(() => getRatingRulesText(locale), [locale]);

  const outcomeHalfK = DEFAULT_K_FACTOR / 2;
  const maxSkillDelta = (DEFAULT_SKILL_WEIGHT_PCT / 100) * DEFAULT_K_FACTOR * 0.5;

  const eloFormula = useMemo(
    () =>
      `expected = 1 / (1 + 10^((oppTeamAvg - myTeamAvg) / ${DEFAULT_ELO_SCALE}))
actual   = 1 if won else 0
outcomeDelta = K × (actual - expected)`,
    []
  );

  const performanceFormula = useMemo(
    () =>
      `perfIndex = ${KD_WEIGHT_IN_PERF} × kdPercentile + ${ADR_WEIGHT_IN_PERF} × adrPercentile
skillDelta = (skillWeightPct / 100) × K × (perfIndex - 0.5)
totalDelta = outcomeDelta + skillDelta

defaults: outcome ${DEFAULT_OUTCOME_WEIGHT_PCT}% / skill ${DEFAULT_SKILL_WEIGHT_PCT}%`,
    []
  );

  const displayStatsFormula = useMemo(
    () =>
      `kdRatio       = totalKills / totalDeaths   (or totalKills if no deaths)
averageDamage = totalDamage / totalMaps`,
    []
  );

  const deltaExampleRows = useMemo(
    () => buildDeltaExampleRows(t, outcomeHalfK, maxSkillDelta),
    [t, outcomeHalfK, maxSkillDelta]
  );

  const paramsRows = useMemo(
    () => buildParamsRows(t),
    [t]
  );

  const perfIndexRows = useMemo(
    () => buildPerfIndexRows(t, maxSkillDelta),
    [t, maxSkillDelta]
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
            <p className="text-sm text-muted-foreground">
              Start {INITIAL_RATING}, K = {DEFAULT_K_FACTOR}, scale = {DEFAULT_ELO_SCALE}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.performanceTitle}</CardTitle>
            <CardDescription>{t.performanceDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormulaBlock>{performanceFormula}</FormulaBlock>
            <p className="text-sm text-muted-foreground">{t.performanceFormulaFootnote}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.exampleDeltaTitle}</CardTitle>
            <CardDescription>{t.exampleDeltaDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <ExampleTable
              headers={[
                t.exampleColResult,
                t.exampleColPerformance,
                t.exampleColOutcome,
                t.exampleColSkill,
                t.exampleColTotal,
              ]}
              rows={deltaExampleRows}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.exampleParamsTitle}</CardTitle>
            <CardDescription>{t.exampleParamsDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <ExampleTable
              headers={[t.exampleColParameter, t.exampleColDefault, t.exampleParamsDescription]}
              rows={paramsRows}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.examplePerfIndexTitle}</CardTitle>
            <CardDescription>{t.examplePerfIndexDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ExampleTable
              headers={[
                t.exampleColPlayer,
                t.exampleColKdRank,
                t.exampleColDmgRank,
                t.exampleColPerfIndex,
                t.exampleColSkillSign,
              ]}
              rows={perfIndexRows}
            />
            <p className="text-sm text-muted-foreground">{t.examplePerfIndexFootnote}</p>
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

function buildDeltaExampleRows(
  t: RatingRulesStrings,
  outcomeHalfK: number,
  maxSkillDelta: number
): string[][] {
  const outcome = formatSigned(outcomeHalfK);
  const outcomeLoss = formatSigned(-outcomeHalfK);
  const skillBest = formatSigned(maxSkillDelta);
  const skillWorst = formatSigned(-maxSkillDelta);
  const zero = formatSigned(0);

  return [
    [t.exampleResultWin, t.examplePerfAverage, outcome, zero, outcome],
    [
      t.exampleResultWin,
      t.examplePerfBest,
      outcome,
      skillBest,
      formatSigned(outcomeHalfK + maxSkillDelta),
    ],
    [
      t.exampleResultWin,
      t.examplePerfWorst,
      outcome,
      skillWorst,
      formatSigned(outcomeHalfK - maxSkillDelta),
    ],
    [
      t.exampleResultLoss,
      t.examplePerfBest,
      outcomeLoss,
      skillBest,
      formatSigned(-outcomeHalfK + maxSkillDelta),
    ],
    [
      t.exampleResultLoss,
      t.examplePerfWorst,
      outcomeLoss,
      skillWorst,
      formatSigned(-outcomeHalfK - maxSkillDelta),
    ],
  ];
}

function buildParamsRows(t: RatingRulesStrings): string[][] {
  return [
    [t.exampleParamStartRating, String(INITIAL_RATING), t.exampleParamStartRatingDesc],
    [t.exampleParamK, String(DEFAULT_K_FACTOR), t.exampleParamKDesc],
    [t.exampleParamScale, String(DEFAULT_ELO_SCALE), t.exampleParamScaleDesc],
    [t.exampleParamOutcome, `${DEFAULT_OUTCOME_WEIGHT_PCT}%`, t.exampleParamOutcomeDesc],
    [t.exampleParamSkill, `${DEFAULT_SKILL_WEIGHT_PCT}%`, t.exampleParamSkillDesc],
    [
      t.exampleParamPerfMix,
      `${KD_WEIGHT_IN_PERF * 100}% K/D, ${ADR_WEIGHT_IN_PERF * 100}% damage`,
      t.exampleParamPerfMixDesc,
    ],
  ];
}

function buildPerfIndexRows(t: RatingRulesStrings, maxSkillDelta: number): string[][] {
  return [
    [t.examplePlayerA, t.exampleRankFirst, t.exampleRankFirst, '~1.0', formatSigned(maxSkillDelta)],
    [t.examplePlayerB, t.exampleRankThird, t.exampleRankSecond, '~0.5', zeroSkillLabel()],
    [t.examplePlayerC, t.exampleRankFifth, t.exampleRankFifth, '~0.0', formatSigned(-maxSkillDelta)],
  ];
}

function zeroSkillLabel(): string {
  return '+0.0';
}
