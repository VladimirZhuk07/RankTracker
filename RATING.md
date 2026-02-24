# Player Rating System

This document explains how player ratings are calculated in RankTracker.
All logic lives in [`src/lib/calculations.ts`](src/lib/calculations.ts) and
[`src/hooks/use-ranked-users.ts`](src/hooks/use-ranked-users.ts).

---

## Overview

Each player's rating is a number on a **0–100 scale**. It reflects three things:

1. **Per-game performance** — kills, deaths, and damage, adjusted for win/loss/neutral outcome.
2. **Normalization** — scores are scaled against a fixed theoretical ceiling so the number is immediately meaningful.
3. **Activity penalty** — players who have not played recently are penalized relative to the most recently active player.

---

## Step 1 — Win/Loss/Neutral Modifier

Every match has a modifier applied to kills and damage (but **not** deaths — dying is equally costly regardless of the match outcome):

```
if sessionHasWinner:
  modifier = won ? 1.2 : 0.8
else:
  modifier = 1.0
```

- **Win** (W): boosts a player's kill and damage contributions by 20%.
- **Loss** (L): reduces a player's kill and damage contributions by 20%.
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

### Why MAX_RAW_RATING = 54?

54 was chosen to accommodate realistic high-performance play. The ceiling is defined by
an exceptional theoretical player profile:

| Parameter | Value |
|---|---|
| Games per year | 312 (6 maps/week × 52 weeks) |
| Win rate | 60% |
| K/D ratio | **3.2:1** |
| Avg damage per map | **4,500** |

Working through the math:

```
avgModifier        = 0.6 × 1.2 + 0.4 × 0.8 = 1.04   (average win/loss modifier across all matches)

effectiveKdRatio   = 3.2 × 1.04 = 3.328              (kills boosted by modifier, deaths unmodified)
effectiveAvgDamage = 4,500 × 1.04 = 4,680            (damage boosted by modifier per map)

rawRating = 3.328 × 2 + 4,680 / 100 = 6.656 + 46.8 = 53.456 ≈ 54
```

The `× 1.04` applied to K/D and damage reflects the win modifier effect: wins boost kills and damage by 1.2, losses reduce them by 0.8, and at a 60% win rate those average out to a 1.04 multiplier. The raw stats of the ceiling player are **K/D 3.2:1** and **4,500 damage/map** — these become 3.328 and 4,680 after the modifier is applied.

4,500 average damage per map represents an exceptional, rarely achieved level of play —
comfortably above what most strong players produce (typically 2,000–3,500/map), which
means the 0–100 scale is meaningful throughout its range.

The theoretical ceiling player would score **≈99.9 out of 100**. As a safety net,
`finalRating` is clamped to a maximum of **100** to guard against any edge case.
Real players with strong consistent performance will realistically land in the **30–70** range.

---

## Step 5 — Activity Penalty

```
referenceDate     = most recent match date across ALL players
daysSinceLastPlay = referenceDate − player's most recent match date (in days)
activityWeight    = clamp(1 − daysSinceLastPlay / 365, 0, 1)

finalRating = normalizedRating × activityWeight
```

### How it works

| Days since last play | Activity weight | Effect on rating |
|---|---|---|
| 0 (played today) | 1.00 | No penalty |
| 30 days | ≈0.92 | −8% |
| 90 days | ≈0.75 | −25% |
| 180 days | ≈0.51 | −49% |
| 365 days | 0.00 | Rating drops to 0 |

### Key properties

- **Relative, not absolute.** The penalty is calculated relative to the most recent match
  across all players, not relative to today's date. If nobody plays for a month, all
  penalties freeze — ratings stay stable until new data arrives.
- **Continuous.** A player who stops playing gradually loses standing as others keep
  playing and push the reference date forward.
- **Recoverable.** Playing a new match immediately restores `daysSinceLastPlay = 0`
  and removes the penalty.

---

## Complete Formula

```
if sessionHasWinner:
  modifier = won ? 1.2 : 0.8
else:
  modifier = 1.0                                         (neutral session: no bonus/penalty)

effectiveKills  = Σ kills  × modifier
effectiveDeaths = Σ deaths
effectiveDamage = Σ damage × modifier

kdRatio         = effectiveKills / effectiveDeaths
averageDamage   = effectiveDamage / totalMaps
rawRating       = kdRatio × 2 + averageDamage / 100
normalizedRating = (rawRating / 54) × 100

referenceDate   = max match date across all players
activityWeight  = clamp(1 − daysSinceLastPlay / 365, 0, 1)

finalRating     = normalizedRating × activityWeight         (0–100)
```

---

## Example: Activity Break

Player A played 10 games in January, then stopped. Player B played 10 games spread across
the whole year. Both players have identical per-game stats (K/D 2.5, 60% win rate).

Without the activity penalty, both have the same `normalizedRating`.

If it is now November and Player B played yesterday:

- **Player B:** `daysSinceLastPlay = 1` → `activityWeight ≈ 1.0` → no penalty
- **Player A:** `daysSinceLastPlay ≈ 300` → `activityWeight ≈ 0.18` → rating reduced to 18% of its value

If neither player plays for the next month, both penalties freeze at those values until
someone plays again and advances the reference date.
