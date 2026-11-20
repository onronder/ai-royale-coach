import { createMeasuredAIFetch, type AIContext } from './ai-generation.ts'
import { z } from 'npm:zod@4.6.7'
import { Output, streamText } from 'npm:ai@6'
import { createOpenAI } from 'npm:@ai-sdk/openai@3'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayResponseHeaders } from './run-id.ts'

// Paid coaching retains its existing model/options. Only free calls use the bounded output budget.
export const COACHING_MODEL = 'openai/gpt-6-astra'
export function createCoachingAI(
  aiKey: string,
  signal: AbortSignal,
  language: string,
  bounded = false,
  context?: AIContext,
) {
  return async <T>(
    prompt: string,
    schema: z.ZodType<T>,
    system = `You are a Clash Royale coach. Respond in ${language}. Select card IDs using displayLevel, the level in the game. In reason, practice and answer give tactical advice only. Use {card} to refer to the incoming card. Do not write any card names, numbers, levels or swap instructions in prose. The app supplies the exact names and levels. Logs do not reveal placement, elixir use or timing: never invent observed gameplay. Give short, specific advice; do not promise wins or trophies.`,
  ) => {
    if (!context) throw new Error('Missing AI measurement context')
    const run = createLovableAiGatewayRunIdFetch(undefined, createMeasuredAIFetch(context))
    const provider = createOpenAI({
      apiKey: aiKey,
      baseURL: 'https://ai.gateway.lovable.dev/v1',
      headers: { 'Lovable-API-Key': aiKey, 'X-Lovable-AIG-SDK': 'vercel-ai-sdk' },
      fetch: run.fetch,
    })
    const result = streamText({
      model: provider.responses('openai/gpt-6-astra'),
      system,
      messages: [{ role: 'user', content: prompt }],
      output: Output.object({ schema }),
      abortSignal: signal,
      maxRetries: 0,
      ...(bounded ? { maxOutputTokens: 4096 } : {}),
      providerOptions: {
        openai: {
          store: false,
          forceReasoning: true,
          reasoningEffort: 'low',
          reasoningSummary: 'auto',
          include: ['reasoning.encrypted_content'],
        },
      },
    })
    const output = await result.output
    const usage = await result.usage
    const response = await result.response
    if (!output) throw new Error('AI returned no coaching advice')
    return {
      output,
      usage,
      runId: run.getRunId(),
      headers: getLovableAiGatewayResponseHeaders(response.headers, corsHeaders),
    }
  }
}
