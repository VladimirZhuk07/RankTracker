# Player Rating System

This document explains how player ratings are calculated in RankTracker.
All logic lives in [`src/lib/calculations.ts`](src/lib/calculations.ts) and
[`src/hooks/use-ranked-users.ts`](src/hooks/use-ranked-users.ts).

---

## Overview

Each player's rating is a number on a **0–100 scale**. It reflects two things:

1. **Per-game performance** — kills, deaths, and damage, adjusted for win/loss/neutral outcome.
2. **Normalization** — scores are scaled against a fixed theoretical ceiling so the number is immediately meaningful.

---

## Step 1 — Win/Loss/Neutral Modifier

Every match has a modifier applied to kills and damage (but **not** deaths — dying is equally costly regardless of the match outcome):

```
if sessionHasWinner:
  modifier = won ? 1.1 : 0.9
else:
  modifier = 1.0
```

- **Win** (W): boosts a player's kill and damage contributions by 10%.
- **Loss** (L): reduces a player's kill and damage contributions by 10%.
- **Neutral/Draw** (N): applies no bonus and no penalty.

A session is considered **neutral** when no player in that session has `won = true` (typically equal rounds per team so there is no winner). In a neutral session, all players receive `modifier = 1.0`.

Deaths are never modified — accumulating deaths in a loss is not forgiven.

---

## Step 2 — Aggregation

Each match contributes to the player's running totals:

```
effectiveKills  += kills  × modifier
effectiveDeaths += deaths
effectiveDamage += damage × modifier
totalMaps       += 1
```

After all matches are summed, per-game rates are derived:

```
kdRatio       = effectiveKills / effectiveDeaths   (= effectiveKills if no deaths)
averageDamage = effectiveDamage / totalMaps
```

---

## Step 3 — Raw Rating

The raw rating combines K/D and average damage using the same formula as before:

```
rawRating = kdRatio × 2 + averageDamage / 100
```

K/D is weighted twice as heavily as damage per map (scaled by 1/100).

---

## Step 4 — Normalization to 0–100

```
normalizedRating = (rawRating / MAX_RAW_RATING) × 100
```

### Why MAX_RAW_RATING = 52.43?

52.43 was chosen to accommodate realistic high-performance play. The ceiling is defined by
an exceptional theoretical player profile:

| Parameter | Value |
|---|---|
| Games per year | 312 (6 maps/week × 52 weeks) |
| Win rate | 60% |
| K/D ratio | **3.2:1** |
| Avg damage per map | **4,500** |

Working through the math:

```
avgModifier        = 0.6 × 1.1 + 0.4 × 0.9 = 1.02   (average win/loss modifier across all matches)

effectiveKdRatio   = 3.2 × 1.02 = 3.264              (kills boosted by modifier, deaths unmodified)
effectiveAvgDamage = 4,500 × 1.02 = 4,590            (damage boosted by modifier per map)

rawRating = 3.264 × 2 + 4,590 / 100 = 6.528 + 45.9 = 52.428 ≈ 52.43
```

The `× 1.02` applied to K/D and damage reflects the win modifier effect: wins boost kills and damage by 1.1, losses reduce them by 0.9, and at a 60% win rate those average out to a 1.02 multiplier. The raw stats of the ceiling player are **K/D 3.2:1** and **4,500 damage/map** — these become 3.264 and 4,590 after the modifier is applied.

4,500 average damage per map represents an exceptional, rarely achieved level of play —
comfortably above what most strong players produce (typically 2,000–3,500/map), which
means the 0–100 scale is meaningful throughout its range.

The theoretical ceiling player would score **≈99.9 out of 100**. As a safety net,
`finalRating` is clamped to a maximum of **100** to guard against any edge case.
Real players with strong consistent performance will realistically land in the **30–70** range.

```
finalRating = min(100, normalizedRating)
```

---

## Complete Formula

```
if sessionHasWinner:
  modifier = won ? 1.1 : 0.9
else:
  modifier = 1.0                                         (neutral session: no bonus/penalty)

effectiveKills  = Σ kills  × modifier
effectiveDeaths = Σ deaths
effectiveDamage = Σ damage × modifier

kdRatio         = effectiveKills / effectiveDeaths
averageDamage   = effectiveDamage / totalMaps
rawRating       = kdRatio × 2 + averageDamage / 100
normalizedRating = (rawRating / 52.43) × 100

finalRating     = min(100, normalizedRating)              (0–100)
```
