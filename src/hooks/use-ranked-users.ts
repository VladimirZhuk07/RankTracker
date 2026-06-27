'use client';

import { useMemo } from 'react';
import type { Firestore } from 'firebase/firestore';
import type { MatchRecord, User, UserStatsData } from '@/lib/storage/definitions';
import { aggregateMatchesToStats, aggregateMatchesWeighted, calculateStats, type UserStats } from '@/lib/calculations';
import { getUsersQuery, getMatchesQuery } from '@/lib/storage/queries';
import { useCollection } from '@/firebase';

export type RankedUser = {
  user: User;
  userStatsData: UserStatsData;
  stats: UserStats;
};

export function useRankedUsers(firestore: Firestore | null): { rankedUsers: RankedUser[]; matches: MatchRecord[]; loading: boolean } {
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

    const neutralSessionIds = matches.reduce<Set<string>>((acc, match) => {
      if (!acc.has(match.sessionId)) {
        acc.add(match.sessionId);
      }
      return acc;
    }, new Set<string>());

    matches.forEach((match) => {
      if (match.won && neutralSessionIds.has(match.sessionId)) {
        neutralSessionIds.delete(match.sessionId);
      }
    });

    const matchesByUserId = matches.reduce<Record<string, MatchRecord[]>>((acc, match) => {
      if (!acc[match.userId]) acc[match.userId] = [];
      acc[match.userId].push(match);
      return acc;
    }, {});

    return users
      .map((user) => {
        const userMatches = matchesByUserId[user.id] ?? [];
        const userStatsData = aggregateMatchesToStats(userMatches);
        const weightedStats = aggregateMatchesWeighted(userMatches, neutralSessionIds);

        const stats = calculateStats(weightedStats);
        return { user, userStatsData, stats };
      })
      .sort((a, b) => b.stats.rating - a.stats.rating || a.user.name.localeCompare(b.user.name))
      .map((data, index) => ({
        ...data,
        stats: { ...data.stats, rank: index + 1 },
      }));
  }, [usersData, matchesData]);

  const matches = useMemo(() => (matchesData ?? []) as MatchRecord[], [matchesData]);

  return { rankedUsers, matches, loading };
}
