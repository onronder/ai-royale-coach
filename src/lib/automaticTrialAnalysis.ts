export function firstTrialAnalysisTag(input: {
  status: string | null;
  isTrialActive: boolean;
  hasPreviousUsage: boolean;
  playerTags: string[];
}): string | null {
  if (input.status !== 'trialing' || !input.isTrialActive || input.hasPreviousUsage) return null;
  return input.playerTags[0] ?? null;
}