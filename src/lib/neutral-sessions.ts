import type { MatchRecord } from './storage/definitions';

/** Session is neutral when no player has won=true (scrim / no competitive outcome). */
export function getNeutralSessionIds(matches: MatchRecord[]): Set<string> {
  const neutralIds = new Set<string>();
  const hasWin = new Set<string>();

  for (const match of matches) {
    if (!match.sessionId) {
      continue;
    }

    if (match.won) {
      hasWin.add(match.sessionId);
      neutralIds.delete(match.sessionId);
    } else if (!hasWin.has(match.sessionId)) {
      neutralIds.add(match.sessionId);
    }
  }

  return neutralIds;
}
