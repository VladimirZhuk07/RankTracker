/**
 * @fileOverview Mathematical team balancing algorithms for creating fair CS2 teams
 * 
 * This service uses statistical methods to create balanced teams based on player ratings
 * and performance metrics without requiring AI services.
 */

import type { User } from '@/lib/definitions';
import type { UserStats } from '@/lib/calculations';

export type PlayerData = {
  user: User;
  stats: UserStats;
};

export type Team = {
  name: string;
  players: Array<{
    id: string;
    name: string;
    rating: number;
  }>;
  averageRating: number;
  totalRating: number;
};

export type TeamDivisionResult = {
  team1: Team;
  team2: Team;
  balanceAnalysis: {
    ratingDifference: number;
    fairnessScore: number;
    explanation: string;
    method: string;
  };
};

/**
 * Greedy algorithm: Always assign the next best player to the weaker team
 * This tends to create very balanced teams for most scenarios
 */
export function divideTeamsGreedy(players: PlayerData[]): TeamDivisionResult {
  if (players.length < 2) {
    throw new Error('Need at least 2 players to create teams');
  }

  // Sort players by rating (descending)
  const sortedPlayers = [...players].sort((a, b) => b.stats.rating - a.stats.rating);
  
  const team1: PlayerData[] = [];
  const team2: PlayerData[] = [];
  let team1Rating = 0;
  let team2Rating = 0;

  // Assign each player to the team with lower total rating
  sortedPlayers.forEach(player => {
    if (team1Rating <= team2Rating) {
      team1.push(player);
      team1Rating += player.stats.rating;
    } else {
      team2.push(player);
      team2Rating += player.stats.rating;
    }
  });

  return formatTeamResult(team1, team2, 'Greedy Assignment');
}

/**
 * Greedy algorithm with randomization for close skill levels
 * Adds randomness when team ratings are very close to prevent repetitive team formations
 */
export function divideTeamsGreedyWithRandomness(players: PlayerData[], randomThreshold: number = 0.5): TeamDivisionResult {
  if (players.length < 2) {
    throw new Error('Need at least 2 players to create teams');
  }

  // Sort players by rating (descending)
  const sortedPlayers = [...players].sort((a, b) => b.stats.rating - a.stats.rating);
  
  const team1: PlayerData[] = [];
  const team2: PlayerData[] = [];
  let team1Rating = 0;
  let team2Rating = 0;

  // Assign each player to the team with lower total rating, with randomness for close calls
  sortedPlayers.forEach(player => {
    const ratingDifference = Math.abs(team1Rating - team2Rating);
    
    // If teams are very close in rating, add some randomness
    if (ratingDifference <= randomThreshold) {
      // 50/50 chance when teams are balanced
      if (Math.random() < 0.5) {
        team1.push(player);
        team1Rating += player.stats.rating;
      } else {
        team2.push(player);
        team2Rating += player.stats.rating;
      }
    } else {
      // Normal greedy assignment when there's a clear weaker team
      if (team1Rating <= team2Rating) {
        team1.push(player);
        team1Rating += player.stats.rating;
      } else {
        team2.push(player);
        team2Rating += player.stats.rating;
      }
    }
  });

  return formatTeamResult(team1, team2, 'Greedy with Randomness');
}

/**
 * Snake draft algorithm: Alternates picks like a real draft
 * Team 1 picks first, then Team 2 picks twice, then Team 1 picks twice, etc.
 */
export function divideTeamsSnakeDraft(players: PlayerData[]): TeamDivisionResult {
  if (players.length < 2) {
    throw new Error('Need at least 2 players to create teams');
  }

  // Sort players by rating (descending)
  const sortedPlayers = [...players].sort((a, b) => b.stats.rating - a.stats.rating);
  
  const team1: PlayerData[] = [];
  const team2: PlayerData[] = [];
  let currentTeam = 1;
  let pickCount = 0;
  let picksInRound = 1;

  sortedPlayers.forEach(player => {
    if (currentTeam === 1) {
      team1.push(player);
    } else {
      team2.push(player);
    }

    pickCount++;
    
    // Switch teams after completing picks for current round
    if (pickCount >= picksInRound) {
      currentTeam = currentTeam === 1 ? 2 : 1;
      pickCount = 0;
      // After first pick, alternate in groups of 2
      picksInRound = 2;
    }
  });

  return formatTeamResult(team1, team2, 'Snake Draft');
}

/**
 * Balanced distribution: Tries to minimize the difference in average ratings
 * Uses a more sophisticated approach considering multiple combinations
 */
export function divideTeamsBalanced(players: PlayerData[]): TeamDivisionResult {
  if (players.length < 2) {
    throw new Error('Need at least 2 players to create teams');
  }

  if (players.length <= 6) {
    // For small groups, try different combinations to find the most balanced
    return findOptimalDivision(players);
  } else {
    // For larger groups, use greedy with slight randomness to add variety
    return divideTeamsGreedyWithRandomness(players, 0.3);
  }
}

/**
 * Tries different team combinations to find the most balanced division
 * Only practical for smaller groups (6 players or less)
 */
function findOptimalDivision(players: PlayerData[]): TeamDivisionResult {
  const totalPlayers = players.length;
  const team1Size = Math.floor(totalPlayers / 2);
  
  let bestDivision: { team1: PlayerData[], team2: PlayerData[] } | null = null;
  let bestBalance = Infinity;

  // Generate all possible combinations for team1
  const combinations = generateCombinations(players, team1Size);
  
  combinations.forEach(team1Players => {
    const team2Players = players.filter(p => !team1Players.includes(p));
    
    const team1Avg = calculateAverageRating(team1Players);
    const team2Avg = calculateAverageRating(team2Players);
    const balance = Math.abs(team1Avg - team2Avg);
    
    if (balance < bestBalance) {
      bestBalance = balance;
      bestDivision = { team1: team1Players, team2: team2Players };
    }
  });

  if (!bestDivision) {
    throw new Error('Could not find optimal division');
  }

  return formatTeamResult(bestDivision.team1, bestDivision.team2, 'Optimal Balance');
}

/**
 * Weighted balancing: Considers multiple factors beyond just rating
 * Weights: Rating (60%), K/D (25%), ADR (15%)
 */
export function divideTeamsWeighted(players: PlayerData[]): TeamDivisionResult {
  if (players.length < 2) {
    throw new Error('Need at least 2 players to create teams');
  }

  // Calculate composite scores
  const playersWithScores = players.map(player => ({
    ...player,
    compositeScore: calculateCompositeScore(player.stats)
  }));

  // Sort by composite score
  const sortedPlayers = playersWithScores.sort((a, b) => b.compositeScore - a.compositeScore);
  
  const team1: PlayerData[] = [];
  const team2: PlayerData[] = [];
  let team1Score = 0;
  let team2Score = 0;

  // Assign to team with lower composite score
  sortedPlayers.forEach(player => {
    if (team1Score <= team2Score) {
      team1.push(player);
      team1Score += player.compositeScore;
    } else {
      team2.push(player);
      team2Score += player.compositeScore;
    }
  });

  return formatTeamResult(team1, team2, 'Weighted Multi-Factor');
}

/**
 * Weighted balancing with randomization for similar skill players
 * Adds variety when players have very similar composite scores
 */
export function divideTeamsWeightedWithRandomness(players: PlayerData[], randomThreshold: number = 15): TeamDivisionResult {
  if (players.length < 2) {
    throw new Error('Need at least 2 players to create teams');
  }

  // Calculate composite scores
  const playersWithScores = players.map(player => ({
    ...player,
    compositeScore: calculateCompositeScore(player.stats)
  }));

  // Sort by composite score with some randomization for similar players
  const sortedPlayers = shuffleSimilarPlayers(playersWithScores, randomThreshold);
  
  const team1: PlayerData[] = [];
  const team2: PlayerData[] = [];
  let team1Score = 0;
  let team2Score = 0;

  // Assign to team with lower composite score, with randomness for close calls
  sortedPlayers.forEach(player => {
    const scoreDifference = Math.abs(team1Score - team2Score);
    
    // If teams are very close in composite score, add some randomness
    if (scoreDifference <= randomThreshold) {
      if (Math.random() < 0.5) {
        team1.push(player);
        team1Score += player.compositeScore;
      } else {
        team2.push(player);
        team2Score += player.compositeScore;
      }
    } else {
      // Normal assignment when there's a clear weaker team
      if (team1Score <= team2Score) {
        team1.push(player);
        team1Score += player.compositeScore;
      } else {
        team2.push(player);
        team2Score += player.compositeScore;
      }
    }
  });

  return formatTeamResult(team1, team2, 'Weighted with Randomness');
}

/**
 * Calculate a composite score considering multiple performance factors
 */
function calculateCompositeScore(stats: UserStats): number {
  const ratingWeight = 0.6;
  const kdWeight = 0.25;
  const adrWeight = 0.15;

  // Normalize K/D ratio (cap at 3.0 for extreme outliers)
  const normalizedKD = Math.min(stats.kdRatio, 3.0);
  
  // Normalize ADR (typical range 50-100)
  const normalizedADR = Math.min(stats.averageDamage / 100, 1.0);

  return (stats.rating * ratingWeight) + 
         (normalizedKD * kdWeight * 100) + 
         (normalizedADR * adrWeight * 100);
}

/**
 * Helper function to generate all combinations of a given size
 */
function generateCombinations<T>(array: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (array.length === 0) return [];
  
  const [first, ...rest] = array;
  const withFirst = generateCombinations(rest, size - 1).map(combo => [first, ...combo]);
  const withoutFirst = generateCombinations(rest, size);
  
  return [...withFirst, ...withoutFirst];
}

/**
 * Calculate average rating for a group of players
 */
function calculateAverageRating(players: PlayerData[]): number {
  if (players.length === 0) return 0;
  const totalRating = players.reduce((sum, player) => sum + player.stats.rating, 0);
  return totalRating / players.length;
}

/**
 * Format the team division result with analysis
 */
function formatTeamResult(team1Players: PlayerData[], team2Players: PlayerData[], method: string): TeamDivisionResult {
  const team1Rating = calculateAverageRating(team1Players);
  const team2Rating = calculateAverageRating(team2Players);
  const ratingDifference = Math.abs(team1Rating - team2Rating);
  
  // Calculate fairness score (100 = perfectly balanced, 0 = completely unbalanced)
  const maxPossibleDiff = Math.max(team1Rating, team2Rating);
  const fairnessScore = Math.max(0, 100 - (ratingDifference / maxPossibleDiff * 100));

  const team1: Team = {
    name: "Team Alpha",
    players: team1Players.map(p => ({
      id: p.user.id,
      name: p.user.name,
      rating: p.stats.rating
    })),
    averageRating: team1Rating,
    totalRating: team1Players.reduce((sum, p) => sum + p.stats.rating, 0)
  };

  const team2: Team = {
    name: "Team Beta",
    players: team2Players.map(p => ({
      id: p.user.id,
      name: p.user.name,
      rating: p.stats.rating
    })),
    averageRating: team2Rating,
    totalRating: team2Players.reduce((sum, p) => sum + p.stats.rating, 0)
  };

  return {
    team1,
    team2,
    balanceAnalysis: {
      ratingDifference,
      fairnessScore,
      explanation: `${method}: Rating difference of ${ratingDifference.toFixed(2)} (${fairnessScore.toFixed(1)}% balanced)`,
      method
    }
  };
}

/**
 * Shuffle players with similar scores to add variety
 */
function shuffleSimilarPlayers(playersWithScores: Array<PlayerData & { compositeScore: number }>, threshold: number): Array<PlayerData & { compositeScore: number }> {
  const sorted = [...playersWithScores].sort((a, b) => b.compositeScore - a.compositeScore);
  const result: Array<PlayerData & { compositeScore: number }> = [];
  
  let i = 0;
  while (i < sorted.length) {
    // Find group of players with similar scores
    const currentScore = sorted[i].compositeScore;
    const similarGroup = [];
    
    while (i < sorted.length && Math.abs(sorted[i].compositeScore - currentScore) <= threshold) {
      similarGroup.push(sorted[i]);
      i++;
    }
    
    // Shuffle the similar group and add to result
    const shuffled = shuffleArray(similarGroup);
    result.push(...shuffled);
  }
  
  return result;
}

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Main function to divide teams using the best algorithm for the given scenario
 */
export function divideIntoBalancedTeams(
  players: PlayerData[], 
  algorithm: 'greedy' | 'snake' | 'balanced' | 'weighted' | 'random-greedy' | 'random-weighted' = 'balanced'
): TeamDivisionResult {
  switch (algorithm) {
    case 'greedy':
      return divideTeamsGreedy(players);
    case 'snake':
      return divideTeamsSnakeDraft(players);
    case 'weighted':
      return divideTeamsWeighted(players);
    case 'random-greedy':
      return divideTeamsGreedyWithRandomness(players);
    case 'random-weighted':
      return divideTeamsWeightedWithRandomness(players);
    case 'balanced':
    default:
      return divideTeamsBalanced(players);
  }
}