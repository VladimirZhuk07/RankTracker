'use server';
/**
 * @fileOverview A flow for analyzing player game statistics.
 *
 * - analyzePlayerStats - A function that takes player stats and returns an AI-powered analysis.
 * - StatsAnalysisInput - The input type for the analysis function.
 * - StatsAnalysisOutput - The return type for the analysis function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const StatsAnalysisInputSchema = z.object({
  stats: z.string().describe('A string containing player statistics, like kills, deaths, maps played, etc.'),
});
export type StatsAnalysisInput = z.infer<typeof StatsAnalysisInputSchema>;

export const StatsAnalysisOutputSchema = z.object({
  summary: z.string().describe('A brief, overall summary of the player\'s performance based on the stats.'),
  highlight: z.string().describe('The single most impressive stat or aspect of the player\'s performance.'),
  suggestion: z.string().describe('A specific, actionable suggestion for what the player should focus on to improve.'),
});
export type StatsAnalysisOutput = z.infer<typeof StatsAnalysisOutputSchema>;

const analysisPrompt = ai.definePrompt({
    name: 'statsAnalysisPrompt',
    input: { schema: StatsAnalysisInputSchema },
    output: { schema: StatsAnalysisOutputSchema },
    prompt: `You are an expert esports performance analyst for Counter-Strike.
    Your task is to analyze the provided player statistics.
    
    Based on the stats below, provide a concise performance summary, identify one key highlight, and offer one actionable suggestion for improvement.
    
    Player Stats:
    {{{stats}}}
    `,
});


const analyzeStatsFlow = ai.defineFlow(
  {
    name: 'analyzeStatsFlow',
    inputSchema: StatsAnalysisInputSchema,
    outputSchema: StatsAnalysisOutputSchema,
  },
  async (input) => {
    const { output } = await analysisPrompt(input);
    return output!;
  }
);

export async function analyzePlayerStats(input: StatsAnalysisInput): Promise<StatsAnalysisOutput> {
  return analyzeStatsFlow(input);
}
