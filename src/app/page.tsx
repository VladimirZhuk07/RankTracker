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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Info, BarChart, Crosshair, Skull, Dices, Target, LoaderCircle, Users, X, Shuffle, Copy, CheckCircle } from 'lucide-react';
import { DownloadRatingsButton } from '@/components/DownloadRatingsButton';
import { useCollection } from '@/firebase';
import { collection, query, orderBy, getFirestore } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useMemo, useState } from 'react';
import { divideIntoBalancedTeams, type TeamDivisionResult } from '@/lib/team-balancer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

function getRankColor(rank: number) {
  if (rank === 1) return 'bg-yellow-500/80 text-yellow-950 border-yellow-500';
  if (rank === 2) return 'bg-gray-400/80 text-gray-950 border-gray-400';
  if (rank === 3) return 'bg-amber-600/80 text-amber-950 border-amber-600';
  return 'border-transparent';
}

function StatsPopover({ 
  user, 
  stats, 
  isSelectionMode, 
  isSelected, 
  onSelectionChange 
}: { 
  user: User; 
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
      {isSelectionMode && (
        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleSelectionChange}
          />
        </TableCell>
      )}
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
    </>
  );

  if (isSelectionMode) {
    return (
      <TableRow 
        className={`cursor-pointer transition-colors ${isSelected ? "bg-muted/50" : "hover:bg-muted/30"}`}
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
  const [isTeamSelectionMode, setIsTeamSelectionMode] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [useRandomness, setUseRandomness] = useState(false);
  const [teamResult, setTeamResult] = useState<TeamDivisionResult | null>(null);
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [copied, setCopied] = useState(false);

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
    try {
      // Get selected players with their stats
      const selectedPlayersData = rankedUsers.filter(({ user }) => 
        selectedPlayers.has(user.id)
      );
      
      console.log('Selected players for team division:', selectedPlayersData);
      
      // Use mathematical team balancing with optional randomness
      const algorithm = useRandomness ? 'random-weighted' : 'balanced';
      const teamDivision = divideIntoBalancedTeams(selectedPlayersData, algorithm);
      console.log('Team division result:', teamDivision);
      
      // Show the results in a dialog
      setTeamResult(teamDivision);
      setShowTeamDialog(true);
      
    } catch (error) {
      console.error('Error dividing teams:', error);
      alert('Error creating teams. Please try again.');
    }
  };

  const generateTeamText = (result: TeamDivisionResult) => {
    const team1List = result.team1.players.map(p => `• ${p.name} (${p.rating.toFixed(2)})`).join('\n');
    const team2List = result.team2.players.map(p => `• ${p.name} (${p.rating.toFixed(2)})`).join('\n');
    
    return `${result.team1.name} (Avg: ${result.team1.averageRating.toFixed(2)}):\n${team1List}\n\n` +
           `${result.team2.name} (Avg: ${result.team2.averageRating.toFixed(2)}):\n${team2List}\n\n` +
           `📊 ${result.balanceAnalysis.explanation}`;
  };

  const handleCopyTeams = async () => {
    if (!teamResult) return;
    
    try {
      await navigator.clipboard.writeText(generateTeamText(teamResult));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = generateTeamText(teamResult);
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
    // Exit team selection mode after showing results
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
              <DownloadRatingsButton users={rankedUsers.map(({user, stats}) => ({...user, ...stats}))} />
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
              <div className="mt-6 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    Select Players for Teams
                  </h3>
                  <p className="text-blue-700 mb-4">
                    Choose at least 3 players to divide into balanced teams.
                  </p>
                  
                  {/* Randomness Toggle */}
                  <div className="flex items-center gap-2 mb-4">
                    <Checkbox
                      id="randomness-toggle"
                      checked={useRandomness}
                      onCheckedChange={setUseRandomness}
                    />
                    <label htmlFor="randomness-toggle" className="text-sm text-blue-700 cursor-pointer flex items-center gap-1">
                      <Shuffle className="h-4 w-4" />
                      Add randomness for similar skill players
                    </label>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button 
                      onClick={handleCancelSelection}
                      variant="outline"
                      className="border-gray-300"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleDivideIntoTeams}
                      disabled={!canDivideIntoTeams}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Divide into Teams ({selectedPlayers.size} selected)
                    </Button>
                  </div>
                  {selectedPlayers.size < 3 && (
                    <p className="text-sm text-blue-600 mt-2">
                      Select at least 3 players to continue
                    </p>
                  )}
                </div>
              </div>
            )}
        </div>

        <div className="w-full max-w-4xl">
          <div className="rounded-lg border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  {isTeamSelectionMode && (
                    <TableHead className="w-16 text-center">Select</TableHead>
                  )}
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
                    <TableCell colSpan={isTeamSelectionMode ? 4 : 3} className="text-center">
                      <div className="flex items-center justify-center py-8">
                        <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
                        <span className="ml-4">Loading Rankings...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!loading && rankedUsers.length === 0 && (
                   <TableRow>
                    <TableCell colSpan={isTeamSelectionMode ? 4 : 3} className="text-center py-8 text-muted-foreground">
                      No players found. Add some in the admin dashboard!
                    </TableCell>
                  </TableRow>
                )}
                {!loading && rankedUsers.map(({ user, stats }) => (
                  <StatsPopover 
                    key={user.id} 
                    user={user} 
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

      {/* Team Results Dialog */}
      <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              🎯 Teams Created!
            </DialogTitle>
            <DialogDescription>
              Your balanced teams are ready. You can copy this text to share in chat.
            </DialogDescription>
          </DialogHeader>

          {teamResult && (
            <div className="space-y-6">
              {/* Team Alpha */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">
                  {teamResult.team1.name} (Avg: {teamResult.team1.averageRating.toFixed(2)})
                </h3>
                <div className="space-y-2">
                  {teamResult.team1.players.map((player, index) => (
                    <div key={player.id} className="flex justify-between items-center bg-white rounded px-3 py-2">
                      <span className="font-bold text-gray-900">{player.name}</span>
                      <span className="text-sm font-mono font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {player.rating.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Team Beta */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900 mb-3">
                  {teamResult.team2.name} (Avg: {teamResult.team2.averageRating.toFixed(2)})
                </h3>
                <div className="space-y-2">
                  {teamResult.team2.players.map((player, index) => (
                    <div key={player.id} className="flex justify-between items-center bg-white rounded px-3 py-2">
                      <span className="font-bold text-gray-900">{player.name}</span>
                      <span className="text-sm font-mono font-bold bg-green-100 text-green-800 px-2 py-1 rounded">
                        {player.rating.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Balance Analysis */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">📊 Balance Analysis</h4>
                <p className="text-sm text-gray-700">{teamResult.balanceAnalysis.explanation}</p>
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
                  <span>Rating Difference: {teamResult.balanceAnalysis.ratingDifference.toFixed(2)}</span>
                  <span>Fairness Score: {teamResult.balanceAnalysis.fairnessScore.toFixed(1)}%</span>
                </div>
              </div>

              {/* Copy Text Preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">📋 Copy Text</h4>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-white border rounded p-3 max-h-32 overflow-y-auto">
                  {generateTeamText(teamResult)}
                </pre>
              </div>
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
