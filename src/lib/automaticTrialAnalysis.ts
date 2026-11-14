export function firstTrialAnalysisTag(input: {
  status: string | null;
  isTrialActive: boolean;
  hasPreviousUsage: boolean;
  playerTags: string[];
  alreadyRedirected?: boolean;
}): string | null {
  if (input.status !== 'trialing' || !input.isTrialActive || input.hasPreviousUsage) return null;
  if (input.alreadyRedirected) return null;
  if (input.playerTags.length !== 1) return null;
  return input.playerTags[0];
}

export const autoTrialRedirectKey = (userId: string) => `auto-trial-redirect:${userId}`;
