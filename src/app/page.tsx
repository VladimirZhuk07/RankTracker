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
import type { MatchRecord, SessionRecord, User, UserStatsData } from '@/lib/storage/definitions';
import { CS2_MAPS } from '@/lib/storage/definitions';
import { Header } from '@/components/Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { UserIcon } from '@/components/UserIcon';
import type { UserStats } from '@/lib/calculations';
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
import { Info, BarChart, Crosshair, Skull, Dices, Target, LoaderCircle, Users, X, Shuffle, Copy, CheckCircle, History } from 'lucide-react';
import { useFirebase, useCollection } from '@/firebase';
import { getSessionsQuery } from '@/lib/storage/queries';
import { useState, useMemo } from 'react';
import { divideIntoBalancedTeams, formatTeamDivisionText, type TeamDivisionResult } from '@/lib/team-balancer';
import { useRankedUsers } from '@/hooks/use-ranked-users';
import { calculateUserAchievements, type AchievementResult } from '@/lib/achievements';
import { UserAchievementBadges } from '@/components/achievements/UserAchievementBadges';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function formatMatchDate(timestamp: MatchRecord['date']): string {
  return timestamp.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function MatchHistoryDialog({
  open,
  onOpenChange,
  user,
  userMatches,
  sessionsById,
  neutralSessionIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  userMatches: MatchRecord[];
  sessionsById: Record<string, SessionRecord>;
  neutralSessionIds: Set<string>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col [&>button]:right-2 [&>button]:top-2">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            {user.name}
          </DialogTitle>
          <DialogDescription>
            {userMatches.length} {userMatches.length === 1 ? 'match' : 'matches'} played
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 -mx-1 px-1 custom-scrollbar">
          {userMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No matches recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs py-2">Date</TableHead>
                  <TableHead className="text-xs py-2">Map</TableHead>
                  <TableHead className="w-10 max-w-10 px-1 text-xs py-2 text-center tabular-nums">
                    K
                  </TableHead>
                  <TableHead className="w-10 max-w-10 px-1 text-xs py-2 text-center tabular-nums">
                    D
                  </TableHead>
                  <TableHead className="text-xs py-2 text-center">Dmg</TableHead>
                  <TableHead className="text-xs py-2 text-center">Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userMatches.map((match) => {
                  const mapName = CS2_MAPS[sessionsById[match.sessionId]?.mapIndex] ?? '—';
                  const isNeutral = neutralSessionIds.has(match.sessionId);
                  const kills = Math.round(match.kills);
                  const deaths = Math.round(match.deaths);
                  return (
                    <TableRow key={match.id} className="text-sm">
                      <TableCell className="py-1.5 text-muted-foreground whitespace-nowrap">{formatMatchDate(match.date)}</TableCell>
                      <TableCell className="py-1.5">{mapName}</TableCell>
                      <TableCell
                        className="w-10 max-w-10 px-1 py-1.5 text-center font-mono text-sm tabular-nums"
                        title={String(match.kills)}
                      >
                        {kills}
                      </TableCell>
                      <TableCell
                        className="w-10 max-w-10 px-1 py-1.5 text-center font-mono text-sm tabular-nums"
                        title={String(match.deaths)}
                      >
                        {deaths}
                      </TableCell>
                      <TableCell className="py-1.5 text-center font-mono">{match.damage}</TableCell>
                      <TableCell className="py-1.5 text-center">
                        <Badge
                          variant="outline"
                          className={
                            isNeutral
                              ? 'text-blue-700 border-blue-400 bg-blue-50'
                              : match.won
                                ? 'text-green-700 border-green-400 bg-green-50'
                                : 'text-red-700 border-red-400 bg-red-50'
                          }
                        >
                          {isNeutral ? 'N' : match.won ? 'W' : 'L'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getRankColor(rank: number) {
  if (rank === 1) return 'bg-yellow-500/80 text-yellow-950 border-yellow-500';
  if (rank === 2) return 'bg-gray-400/80 text-gray-950 border-gray-400';
  if (rank === 3) return 'bg-amber-600/80 text-amber-950 border-amber-600';
  return 'border-transparent';
}

function StatsPopover({
  user,
  userStatsData,
  stats,
  userMatches,
  sessionsById,
  achievements,
  isSelectionMode,
  isSelected,
  onSelectionChange,
  neutralSessionIds,
}: {
  user: User;
  userStatsData: UserStatsData;
  stats: UserStats;
  userMatches: MatchRecord[];
  sessionsById: Record<string, SessionRecord>;
  achievements: AchievementResult[];
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (userId: string, selected: boolean) => void;
  neutralSessionIds: Set<string>;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);

  const hasDeaths = userStatsData.totalDeaths > 0;
  const rawKdRatio = hasDeaths ? userStatsData.totalKills / userStatsData.totalDeaths : userStatsData.totalKills;

  const handleSelectionChange = (checked: boolean) => {
    if (onSelectionChange) {
      onSelectionChange(user.id, checked);
    }
  };

  const tableRowContent = (
    <>
      {isSelectionMode ? (
        <TableCell className="w-[56px] py-4 pl-2 pr-2 text-center md:pl-4 md:pr-[11px]" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleSelectionChange}
          />
        </TableCell>
      ) : (
        <TableCell className="w-[56px] py-4 pl-2 pr-2 text-center md:pl-4 md:pr-[11px]">
          <Badge
            variant="outline"
            className={`text-base font-bold md:text-lg ${getRankColor(stats.rank)}`}
          >
            {stats.rank}
          </Badge>
        </TableCell>
      )}
      <TableCell className="min-w-0 py-4 pl-2 pr-2 md:max-w-[230px] md:pl-4 md:pr-4">
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <Avatar className="h-8 w-8 md:h-10 md:w-10">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt={user.name} />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                <UserIcon />
              </div>
            )}
          </Avatar>
          <span className="font-medium min-w-0 flex-1 truncate">{user.name}</span>
        </div>
      </TableCell>
      <TableCell className="max-md:w-[92px] max-md:max-w-[92px] shrink-0 py-3 pl-1 pr-1.5 text-right md:w-[140px] md:min-w-[140px] md:max-w-none md:py-4 md:pl-4 md:pr-4">
        <div className="flex items-center justify-end gap-0.5 whitespace-nowrap md:gap-2">
          <UserAchievementBadges achievements={achievements} />
          <span className="font-mono text-sm tabular-nums leading-none md:text-base md:text-lg">
            {stats.rating.toFixed(2)}
          </span>
        </div>
      </TableCell>
    </>
  );

  if (isSelectionMode) {
    return (
      <TableRow
        className={`cursor-pointer transition-colors ${isSelected ? 'bg-muted/50' : 'hover:bg-muted/30'}`}
        onClick={() => handleSelectionChange(!isSelected)}
      >
        {tableRowContent}
      </TableRow>
    );
  }

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <TableRow className="cursor-pointer">
            {tableRowContent}
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
                  <p className="text-lg font-bold">{rawKdRatio.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">ADR</p>
                  <p className="text-lg font-bold">{stats.averageDamage.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Crosshair className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Kills</p>
                  <p className="text-lg font-bold">{userStatsData.totalKills}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Skull className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Deaths</p>
                  <p className="text-lg font-bold">{userStatsData.totalDeaths}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Dices className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Maps</p>
                  <p className="text-lg font-bold">{userStatsData.totalMaps}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Info className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Damage</p>
                  <p className="text-lg font-bold">{userStatsData.totalDamage}</p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setHistoryOpen(true)}
            >
              <History className="mr-2 h-4 w-4" />
              Match History
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <MatchHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        user={user}
        userMatches={userMatches}
        sessionsById={sessionsById}
        neutralSessionIds={neutralSessionIds}
      />
    </>
  );
}

export default function Home() {
  const { firestore } = useFirebase();
  const { rankedUsers, matches, loading } = useRankedUsers(firestore);

  const sessionsQuery = useMemo(() => {
    if (!firestore) return null;
    return getSessionsQuery(firestore);
  }, [firestore]);

  const { data: sessionsData } = useCollection(sessionsQuery);

  const sessionsById = useMemo(() => {
    const sessions = (sessionsData ?? []) as SessionRecord[];
    return sessions.reduce<Record<string, SessionRecord>>((acc, s) => {
      acc[s.id] = s;
      return acc;
    }, {});
  }, [sessionsData]);

  const matchesByUserId = useMemo(
    () => matches.reduce<Record<string, MatchRecord[]>>((acc, match) => {
      if (!acc[match.userId]) acc[match.userId] = [];
      acc[match.userId].push(match);
      return acc;
    }, {}),
    [matches]
  );
  const neutralSessionIds = useMemo(() => {
    // Match the same neutral-session definition used for ratings:
    // a session is neutral only if *all* matches in that session have won=false.
    const neutralIds = matches.reduce<Set<string>>((acc, match) => {
      if (match.sessionId && !acc.has(match.sessionId)) {
        acc.add(match.sessionId);
      }
      return acc;
    }, new Set<string>());

    matches.forEach((match) => {
      if (match.won && neutralIds.has(match.sessionId)) {
        neutralIds.delete(match.sessionId);
      }
    });

    return neutralIds;
  }, [matches]);

  const achievementsByUserId = useMemo(() => {
    const byUserId: Record<string, AchievementResult[]> = {};
    for (const userId of Object.keys(matchesByUserId)) {
      byUserId[userId] = calculateUserAchievements(matchesByUserId[userId], sessionsById);
    }
    return byUserId;
  }, [matchesByUserId, sessionsById]);
  const [isTeamSelectionMode, setIsTeamSelectionMode] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [useRandomness, setUseRandomness] = useState(false);
  const [teamResult, setTeamResult] = useState<TeamDivisionResult | null>(null);
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreateTeamsClick = () => {
    setIsTeamSelectionMode(true);
    setSelectedPlayers(new Set());
  };

  const handleCancelSelection = () => {
    setIsTeamSelectionMode(false);
    setSelectedPlayers(new Set());
  };

  const handlePlayerSelectionChange = (userId: string, selected: boolean) => {
    const newSelection = new Set(selectedPlayers);
    if (selected) {
      newSelection.add(userId);
    } else {
      newSelection.delete(userId);
    }
    setSelectedPlayers(newSelection);
  };

  const handleDivideIntoTeams = () => {
    const selectedPlayersData = rankedUsers
      .filter(({ user }) => selectedPlayers.has(user.id))
      .map(({ user, stats }) => ({ user, stats }));

    const algorithm = useRandomness ? 'random-weighted' : 'balanced';
    const teamDivision = divideIntoBalancedTeams(selectedPlayersData, algorithm);
    setTeamResult(teamDivision);
    setShowTeamDialog(true);
  };

  const handleCopyTeams = async () => {
    if (!teamResult) return;
    try {
      await navigator.clipboard.writeText(formatTeamDivisionText(teamResult));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = formatTeamDivisionText(teamResult);
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCloseDialog = () => {
    setShowTeamDialog(false);
    setTeamResult(null);
    setCopied(false);
    setIsTeamSelectionMode(false);
    setSelectedPlayers(new Set());
  };

  const canDivideIntoTeams = selectedPlayers.size >= 3;

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center gap-4 p-4 md:gap-8 md:p-8">
        <div className="text-center w-full max-w-4xl flex flex-col items-center">
          <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Player Rankings
          </h1>
          <p className="text-muted-foreground md:text-xl">
            The top players in the CS2 community.
          </p>

          {!isTeamSelectionMode && (
            <div className="mt-6">
              <Button
                onClick={handleCreateTeamsClick}
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 text-lg"
                disabled={loading || rankedUsers.length < 3}
              >
                <Users className="mr-2 h-5 w-5" />
                Create Teams
              </Button>
              {rankedUsers.length < 3 && !loading && (
                <p className="text-sm text-muted-foreground mt-2">
                  Need at least 3 players to create teams
                </p>
              )}
            </div>
          )}

          {isTeamSelectionMode && (
            <div className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Select Players for Teams
                  </CardTitle>
                  <CardDescription>
                    Choose at least 3 players to divide into balanced teams.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="randomness-toggle"
                      checked={useRandomness}
                      onCheckedChange={(checked) => setUseRandomness(checked === true)}
                    />
                    <label htmlFor="randomness-toggle" className="text-sm text-muted-foreground cursor-pointer flex items-center gap-1">
                      <Shuffle className="h-4 w-4" />
                      Add randomness for similar skill players
                    </label>
                  </div>
                </CardContent>

                <CardFooter className="flex gap-3">
                  <Button onClick={handleCancelSelection} variant="outline">
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button onClick={handleDivideIntoTeams} disabled={!canDivideIntoTeams}>
                    <Users className="mr-2 h-4 w-4" />
                    Divide into Teams ({selectedPlayers.size} selected)
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}
        </div>

        <div className="w-full max-w-4xl overflow-x-auto">
          <div className="w-full min-w-0 rounded-lg border shadow-sm md:min-w-[320px]">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  {isTeamSelectionMode ? (
                    <TableHead className="w-[56px] text-center pl-2 pr-2 md:pl-4 md:pr-[11px]">
                      Select
                    </TableHead>
                  ) : (
                    <TableHead className="w-[56px] text-center pl-2 pr-2 md:pl-4 md:pr-[11px]">
                      Rank
                    </TableHead>
                  )}
                  <TableHead className="min-w-0 pl-2 pr-2 md:max-w-[230px] md:pl-4 md:pr-4">
                    Player
                  </TableHead>
                  <TableHead className="max-md:w-[92px] max-md:max-w-[92px] pl-1 pr-1.5 text-right md:w-[140px] md:min-w-[140px] md:max-w-none md:pl-4 md:pr-4">
                    <div className="flex items-center justify-end gap-0.5 whitespace-nowrap md:gap-2">
                      <span className="text-xs md:text-sm">Rating</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground md:h-4 md:w-4" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-mono text-xs">
                              Rating (0–100) = win/loss/neutral-adjusted K/D &amp; damage,
                              normalized to a skill ceiling, with an inactivity penalty (draw sessions are neutral: no bonus or penalty)
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
                {!loading && rankedUsers.map(({ user, userStatsData, stats }) => (
                  <StatsPopover
                    key={user.id}
                    user={user}
                    userStatsData={userStatsData}
                    stats={stats}
                    userMatches={matchesByUserId[user.id] ?? []}
                    sessionsById={sessionsById}
                    achievements={achievementsByUserId[user.id] ?? []}
                    isSelectionMode={isTeamSelectionMode}
                    isSelected={selectedPlayers.has(user.id)}
                    onSelectionChange={handlePlayerSelectionChange}
                    neutralSessionIds={neutralSessionIds}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} RankTracker. Built for the CS2 community.</p>
      </footer>

      <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto custom-scrollbar [&>button]:right-2 [&>button]:top-2">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Teams Created!
                </DialogTitle>
                <DialogDescription>
                  Your balanced teams are ready. You can copy this text.
                </DialogDescription>
              </div>
              {useRandomness && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const selectedPlayersData = rankedUsers
                      .filter(({ user }) => selectedPlayers.has(user.id))
                      .map(({ user, stats }) => ({ user, stats }));
                    setTeamResult(divideIntoBalancedTeams(selectedPlayersData, 'random-weighted'));
                  }}
                  className="flex items-center gap-1"
                >
                  <Shuffle className="h-3 w-3" />
                  Recalculate
                </Button>
              )}
            </div>
          </DialogHeader>

          {teamResult && (
            <div className="space-y-4">
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {teamResult.team1.name}
                  </CardTitle>
                  <CardDescription>
                    Average Rating: {teamResult.team1.averageRating.toFixed(2)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {teamResult.team1.players.map((player) => (
                    <div key={player.id} className="flex justify-between items-center bg-muted rounded px-3 py-2">
                      <span className="font-bold">{player.name}</span>
                      <span className="text-sm font-mono font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {player.rating.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {teamResult.team2.name}
                  </CardTitle>
                  <CardDescription>
                    Average Rating: {teamResult.team2.averageRating.toFixed(2)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {teamResult.team2.players.map((player) => (
                    <div key={player.id} className="flex justify-between items-center bg-muted rounded px-3 py-2">
                      <span className="font-bold">{player.name}</span>
                      <span className="text-sm font-mono font-bold bg-green-100 text-green-800 px-2 py-1 rounded">
                        {player.rating.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart className="h-5 w-5" />
                    Balance Analysis
                  </CardTitle>
                  <CardDescription>
                    {teamResult.balanceAnalysis.explanation}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Rating Difference: <strong>{teamResult.balanceAnalysis.ratingDifference.toFixed(2)}</strong></span>
                    <span>Fairness Score: <strong>{teamResult.balanceAnalysis.fairnessScore.toFixed(1)}%</strong></span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Copy className="h-5 w-5" />
                    Copy Text
                  </CardTitle>
                  <CardDescription>
                    Preview of the text that will be copied to your clipboard
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-muted rounded p-3 max-h-32 overflow-y-auto custom-scrollbar">
                    {formatTeamDivisionText(teamResult)}
                  </pre>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleCloseDialog}>
              Close
            </Button>
            <Button onClick={handleCopyTeams} className="flex items-center gap-2">
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Teams
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
