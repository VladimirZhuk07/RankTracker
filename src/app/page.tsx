'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import type { User } from '@/lib/definitions';
import { Header } from '@/components/Header';
import { Badge } from '@/components/ui/badge';
import { UserIcon } from '@/components/UserIcon';
import { calculateStats, type UserStats } from '@/lib/calculations';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Info, BarChart, Crosshair, Skull, Dices, Target, LoaderCircle } from 'lucide-react';
import { DownloadRatingsButton } from '@/components/DownloadRatingsButton';
import { useCollection } from '@/firebase';
import { collection, query, orderBy, getFirestore } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useMemo } from 'react';

function getRankColor(rank: number) {
  if (rank === 1) return 'bg-yellow-500/80 text-yellow-950 border-yellow-500';
  if (rank === 2) return 'bg-gray-400/80 text-gray-950 border-gray-400';
  if (rank === 3) return 'bg-amber-600/80 text-amber-950 border-amber-600';
  return 'border-transparent';
}

function StatsPopover({ user, stats }: { user: User; stats: UserStats }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <TableRow className="cursor-pointer">
          <TableCell className="text-center">
            <Badge
              variant="outline"
              className={`text-lg font-bold ${getRankColor(stats.rank)}`}
            >
              {stats.rank}
            </Badge>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-3">
              <Avatar>
                {user.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                    <UserIcon />
                  </div>
                )}
              </Avatar>
              <span className="font-medium">{user.name}</span>
            </div>
          </TableCell>
          <TableCell className="text-right font-mono text-lg">
            {stats.rating.toFixed(2)}
          </TableCell>
        </TableRow>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">{user.name} - Stats</h4>
            <p className="text-sm text-muted-foreground">
              Detailed performance metrics.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <BarChart className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">K/D Ratio</p>
                <p className="text-lg font-bold">
                  {stats.kdRatio.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">ADR</p>
                <p className="text-lg font-bold">
                  {stats.averageDamage.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Crosshair className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Kills</p>
                <p className="text-lg font-bold">{user.totalKills}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Skull className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Deaths</p>
                <p className="text-lg font-bold">{user.totalDeaths}</p>
              </div>
            </div>
             <div className="flex items-center space-x-2">
              <Dices className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Maps</p>
                <p className="text-lg font-bold">{user.totalMaps}</p>
              </div>
            </div>
             <div className="flex items-center space-x-2">
              <Info className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Damage</p>
                <p className="text-lg font-bold">{user.totalDamage}</p>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function Home() {
  const { firestore } = useFirebase();

  const usersQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);

  const { data: users, loading } = useCollection(usersQuery);

  const rankedUsers = useMemo(() => {
    if (!users) return [];
    return (users as User[])
      .map((user) => ({
        user,
        stats: calculateStats(user),
      }))
      .sort((a, b) => b.stats.rating - a.stats.rating)
      .map((data, index) => ({
        ...data,
        stats: { ...data.stats, rank: index + 1 },
      }));
  }, [users]);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center gap-4 p-4 md:gap-8 md:p-8">
        <div className="text-center w-full max-w-4xl flex flex-col items-center">
            <div className="flex items-center gap-4">
              <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                Player Rankings
              </h1>
              <DownloadRatingsButton users={rankedUsers.map(({user, stats}) => ({...user, ...stats}))} />
            </div>
            <p className="text-muted-foreground md:text-xl">
                The top players in the CS2 community.
            </p>
        </div>

        <div className="w-full max-w-4xl">
          <div className="rounded-lg border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span>Rating</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-mono text-xs">
                              Rating = K/D Ratio * 2 + ADR / 100
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      <div className="flex items-center justify-center py-8">
                        <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
                        <span className="ml-4">Loading Rankings...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!loading && rankedUsers.length === 0 && (
                   <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No players found. Add some in the admin dashboard!
                    </TableCell>
                  </TableRow>
                )}
                {!loading && rankedUsers.map(({ user, stats }) => (
                  <StatsPopover key={user.id} user={user} stats={stats} />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground">
        Built for the CS2 community.
      </footer>
    </div>
  );
}
