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
import type { User, UserStatsData } from '@/lib/storage/definitions';
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
import { Info, BarChart, Crosshair, Skull, Dices, Target, LoaderCircle, Users, X, Shuffle, Copy, CheckCircle } from 'lucide-react';
import { DownloadRatingsButton } from '@/components/DownloadRatingsButton';
import { useFirebase } from '@/firebase';
import { useState } from 'react';
import { divideIntoBalancedTeams, formatTeamDivisionText, type TeamDivisionResult } from '@/lib/team-balancer';
import { useRankedUsers } from '@/hooks/use-ranked-users';
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
  isSelectionMode,
  isSelected,
  onSelectionChange,
}: {
  user: User;
  userStatsData: UserStatsData;
  stats: UserStats;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (userId: string, selected: boolean) => void;
}) {
  const handleSelectionChange = (checked: boolean) => {
    if (onSelectionChange) {
      onSelectionChange(user.id, checked);
    }
  };

  const tableRowContent = (
    <>
      {isSelectionMode ? (
        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleSelectionChange}
          />
        </TableCell>
      ) : (
        <TableCell className="text-center">
          <Badge
            variant="outline"
            className={`text-lg font-bold ${getRankColor(stats.rank)}`}
          >
            {stats.rank}
          </Badge>
        </TableCell>
      )}
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
                <p className="text-lg font-bold">{stats.kdRatio.toFixed(2)}</p>
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
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function Home() {
  const { firestore } = useFirebase();
  const { rankedUsers, loading } = useRankedUsers(firestore);
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
          <div className="flex items-center gap-4">
            <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Player Rankings
            </h1>
            <DownloadRatingsButton users={rankedUsers.map(({ user, userStatsData, stats }) => ({ ...user, ...userStatsData, ...stats }))} />
          </div>
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

        <div className="w-full max-w-4xl">
          <div className="rounded-lg border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  {isTeamSelectionMode ? (
                    <TableHead className="w-16 text-center">Select</TableHead>
                  ) : (
                    <TableHead className="w-16 text-center">Rank</TableHead>
                  )}
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
                              Rating (0–100) = win/loss-adjusted K/D &amp; damage,
                              normalized to a skill ceiling, with an inactivity penalty
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
                    isSelectionMode={isTeamSelectionMode}
                    isSelected={selectedPlayers.has(user.id)}
                    onSelectionChange={handlePlayerSelectionChange}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground">
        Built for the CS2 community.
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
