'use client';

import { useMemo } from 'react';
import type { Firestore } from 'firebase/firestore';
import type { MatchRecord, User, UserStatsData } from '@/lib/storage/definitions';
import { aggregateMatchesToStats, calculateDisplayStats, type UserStats } from '@/lib/calculations';
import { getNeutralSessionIds } from '@/lib/neutral-sessions';
import {
  computeEloRatings,
  getUserEloRating,
  type EloConfig,
} from '@/lib/rating-elo';
import { getUsersQuery, getMatchesQuery } from '@/lib/storage/queries';
import { useCollection } from '@/firebase';

export type RankedUser = {
  user: User;
  userStatsData: UserStatsData;
  stats: UserStats;
};

export function useRankedUsers(
  firestore: Firestore | null,
  eloConfig?: Partial<EloConfig>
): { rankedUsers: RankedUser[]; matches: MatchRecord[]; loading: boolean } {
  const usersQuery = useMemo(() => {
    if (!firestore) return null;
    return getUsersQuery(firestore);
  }, [firestore]);

  const matchesQuery = useMemo(() => {
    if (!firestore) return null;
    return getMatchesQuery(firestore);
  }, [firestore]);

  const { data: usersData, loading } = useCollection(usersQuery);
  const { data: matchesData } = useCollection(matchesQuery);

  const rankedUsers = useMemo(() => {
    if (!usersData) return [];

    const users = usersData as User[];
    const matches = (matchesData ?? []) as MatchRecord[];
    const neutralSessionIds = getNeutralSessionIds(matches);
    const eloRatings = computeEloRatings(matches, neutralSessionIds, eloConfig);

    const matchesByUserId = matches.reduce<Record<string, MatchRecord[]>>((acc, match) => {
      if (!acc[match.userId]) acc[match.userId] = [];
      acc[match.userId].push(match);
      return acc;
    }, {});

    return users
      .map((user) => {
        const userMatches = matchesByUserId[user.id] ?? [];
        const userStatsData = aggregateMatchesToStats(userMatches);
        const displayStats = calculateDisplayStats(userStatsData);
        const rating = getUserEloRating(eloRatings, user.id, userMatches.length > 0);

        return {
          user,
          userStatsData,
          stats: { ...displayStats, rating, rank: 0 },
        };
      })
      .sort((a, b) => b.stats.rating - a.stats.rating || a.user.name.localeCompare(b.user.name))
      .map((data, index) => ({
        ...data,
        stats: { ...data.stats, rank: index + 1 },
      }));
  }, [usersData, matchesData, eloConfig]);

  const matches = useMemo(() => (matchesData ?? []) as MatchRecord[], [matchesData]);

  return { rankedUsers, matches, loading };
}
