'use client';

import { useMemo } from 'react';
import type { Firestore, Timestamp } from 'firebase/firestore';
import type { MatchRecord, User, UserStatsData } from '@/lib/storage/definitions';
import { aggregateMatchesToStats, aggregateMatchesWeighted, calculateStats, type UserStats } from '@/lib/calculations';
import { getUsersQuery, getMatchesQuery } from '@/lib/storage/queries';
import { useCollection } from '@/firebase';

export type RankedUser = {
  user: User;
  userStatsData: UserStatsData;
  stats: UserStats;
};

function toDate(timestamp: Timestamp): Date {
  return timestamp.toDate();
}

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

    const matchesByUserId = matches.reduce<Record<string, MatchRecord[]>>((acc, match) => {
      if (!acc[match.userId]) acc[match.userId] = [];
      acc[match.userId].push(match);
      return acc;
    }, {});

    const referenceDate = matches.length > 0
      ? new Date(Math.max(...matches.map((m) => toDate(m.date).getTime())))
      : new Date();

    return users
      .map((user) => {
        const userMatches = matchesByUserId[user.id] ?? [];
        const userStatsData = aggregateMatchesToStats(userMatches);
        const weightedStats = aggregateMatchesWeighted(userMatches);

        const playerLastMatchDate = userMatches.length > 0
          ? new Date(Math.max(...userMatches.map((m) => toDate(m.date).getTime())))
          : referenceDate;

        const stats = calculateStats(weightedStats, referenceDate, playerLastMatchDate);
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
