import type { MatchRecord, SessionRecord } from './storage/definitions';
import { CS2_MAPS } from './storage/definitions';

export type AchievementResult = {
  id: string;
  name: string;
  description: string;
  iconPath: string;
};

/** Map index (0..5) to achievement icon filename for "10 wins on map" badges. */
export const MAP_INDEX_TO_ICON: readonly string[] = [
  'ancient-guardian.svg',
  'anubis-pharaoh.svg',
  'sultan-dust-2.svg',
  'inferno-king.svg',
  'mirage_emperor.svg',
  'nuke-engineer.svg',
  'overpass-president.svg',
] as const;

const WINS_THRESHOLD = 10;

function getMapIndex(match: MatchRecord, sessionsById: Record<string, SessionRecord>): number | undefined {
  const session = sessionsById[match.sessionId];
  if (session == null) return undefined;
  return session.mapIndex;
}

function toDateMs(timestamp: { toDate: () => Date }): number {
  return timestamp.toDate().getTime();
}

/**
 * Returns achievement results for a user from their matches and sessions.
 * Includes: per-map "10 wins" badges, favorite map (most wins), anti-map (most losses).
 * Tie-break for favorite/anti: map from last match (by date, then createdAt).
 */
export function calculateUserAchievements(
  userMatches: MatchRecord[],
  sessionsById: Record<string, SessionRecord>
): AchievementResult[] {
  const results: AchievementResult[] = [];

  const winsByMap = new Array<number>(CS2_MAPS.length).fill(0);
  const lossesByMap = new Array<number>(CS2_MAPS.length).fill(0);
  let berserkerQualifyingWins = 0;

  for (const match of userMatches) {
    // "Berserker" achievement is based on per-match performance:
    // won && kills>=25 && K/D>=1.5 (treat deaths=0 as infinite K/D).
    if (
      match.won &&
      match.kills >= 25 &&
      (match.deaths === 0 || match.kills / match.deaths >= 1.5)
    ) {
      berserkerQualifyingWins += 1;
    }

    const mapIndex = getMapIndex(match, sessionsById);
    if (mapIndex == null || mapIndex < 0 || mapIndex >= CS2_MAPS.length) continue;

    if (match.won) {
      winsByMap[mapIndex] += 1;
    } else {
      lossesByMap[mapIndex] += 1;
    }
  }

  for (let mapIndex = 0; mapIndex < CS2_MAPS.length; mapIndex++) {
    if (winsByMap[mapIndex] >= WINS_THRESHOLD) {
      const mapName = CS2_MAPS[mapIndex];
      const iconPath = MAP_INDEX_TO_ICON[mapIndex];
      const id = `map-${mapIndex}-${iconPath.replace('.svg', '')}`;
      results.push({
        id,
        name: getMapAchievementName(mapName),
        description: `10+ wins on ${mapName}`,
        iconPath,
      });
    }
  }

  const lastMatch = userMatches[0];
  const lastMatchMapIndex =
    lastMatch != null ? getMapIndex(lastMatch, sessionsById) : undefined;

  const maxWins = Math.max(0, ...winsByMap);
  if (maxWins > 0) {
    const maxWinsIndices = winsByMap
      .map((w, i) => (w === maxWins ? i : -1))
      .filter((i) => i >= 0);
    const favoriteMapIndex =
      lastMatchMapIndex != null && maxWinsIndices.includes(lastMatchMapIndex)
        ? lastMatchMapIndex
        : maxWinsIndices[0];
    const mapName = CS2_MAPS[favoriteMapIndex];
    results.push({
      id: 'favorite-map',
      name: 'Favorite map',
      description: `Most wins on\n${mapName}`,
      iconPath: 'favorite-map.svg',
    });
  }

  const maxLosses = Math.max(0, ...lossesByMap);
  if (maxLosses > 0) {
    const maxLossesIndices = lossesByMap
      .map((l, i) => (l === maxLosses ? i : -1))
      .filter((i) => i >= 0);
    const antiMapIndex =
      lastMatchMapIndex != null && maxLossesIndices.includes(lastMatchMapIndex)
        ? lastMatchMapIndex
        : maxLossesIndices[0];
    const mapName = CS2_MAPS[antiMapIndex];
    results.push({
      id: 'anti-map',
      name: 'Anti-map',
      description: `Most losses on\n${mapName}`,
      iconPath: 'anti-map.svg',
    });
  }

  if (berserkerQualifyingWins >= 5) {
    results.push({
      id: 'berserker',
      name: 'Berserker',
      description: `5+ won games where each match has\n25+ kills and K/D >= 1.5.`,
      iconPath: 'berserker.svg',
    });
  }

  return results;
}

function getMapAchievementName(mapName: string): string {
  const names: Record<string, string> = {
    Ancient: 'Ancient Guardian',
    Anubis: 'Anubis Pharaoh',
    'Dust II': 'Sultan of Dust II',
    Inferno: 'King of Inferno',
    Mirage: 'Emperor of Mirage',
    Nuke: 'Nuke Engineer',
    Overpass: 'President of Overpass',
  };
  return names[mapName] ?? mapName;
}
