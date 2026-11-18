import { normalizeTag, firstTaskBattle } from '../_shared/coaching-match.ts'
import { resolveCoachingDeck } from '../_shared/coaching-source-deck.ts'
import { coachingCard, formatCoachingAdvice } from '../_shared/coaching-advice.ts'
import { coachingReading, readingFields } from '../_shared/coaching-reading.ts'
import { localizedCardName } from '../_shared/card-names.ts'
import { productLanguage } from '../_shared/language.ts'

export interface FreeDependencies {
  authenticate(req: Request): Promise<{ id: string } | null>
  rpc(name: string, args: Record<string, unknown>): Promise<any>
  game(tag: string, kind: 'player' | 'battles'): Promise<any>
  generate(prompt: string, language: string): Promise<Generated>
  translate(prompt: string, language: string): Promise<Generated>
  model: string
}
interface Generated {
  output: any
  usage: { inputTokens?: number; outputTokens?: number }
  runId?: string | null
}
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const pending = () => response({ error: 'uncertain' }, 409)

// All costly work follows an atomic SQL claim. Tests exercise this handler with real SQL and fake services.
export async function handleFirstValue(req: Request, d: FreeDependencies): Promise<Response> {
  const user = await d.authenticate(req)
  if (!user) return response({ error: 'unauthorized' }, 401)
  const input = await req.json().catch(() => null)
  if (!input || !['get', 'lookup', 'start', 'shown', 'check', 'translate'].includes(input.action))
    return response({ error: 'invalid' }, 400)
  const language = productLanguage(input.language),
    action = input.action
  const rpc = (name: string, args: Record<string, unknown> = {}) =>
    d.rpc(name, { p_user: user.id, ...args })
  const failure = async (code: string, status: number) => {
    await rpc('record_first_value_error', { p_action: action, p_code: code }).catch(() => {})
    return response({ error: code }, status)
  }
  let callId: string | undefined
  let usage: Record<string, unknown> = {}
  try {
    const state = await rpc('first_value_state')
    if (action === 'get') return response(state)
    if (!(await rpc('first_value_request_allowed'))) return response({ error: 'rate_limited' }, 429)
    if (['blocked', 'unverified'].includes(state.reason))
      return response({ error: state.reason }, 403)
    if (action === 'shown') return response(await rpc('mark_first_value_shown'))
    if (action === 'check') {
      const task = state.task
      if (!state.can_read || !task?.shown_at || !task.recommended_deck)
        return response({ error: 'unavailable' }, 403)
      if (
        task.battle_result ||
        (task.last_checked_at && Date.now() - Date.parse(task.last_checked_at) < 30000)
      )
        return response(state)
      const battles = await d.game(task.player_tag, 'battles')
      if (!Array.isArray(battles)) return response({ error: 'game_unavailable' }, 503)
      const match = firstTaskBattle(task.player_tag, task.shown_at, task.recommended_deck, battles)
      return response(
        await rpc('record_first_value_match', { p_shown: task.shown_at, p_match: match }),
      )
    }
    if (action === 'translate') {
      const task = state.task,
        reading = task && coachingReading(task, language)
      if (!state.can_read || !task?.recommendation) return response({ error: 'unavailable' }, 403)
      if (!reading || !Object.keys(reading.needed).length) return response({ translation: {} })
      const glossary = [
        ...new Set<string>([...task.source_deck, ...task.recommended_deck].map((c: any) => c.name)),
      ].map((name) => [
        localizedCardName(name, reading.adviceLanguage),
        localizedCardName(name, reading.followUpLanguage),
        localizedCardName(name, language),
      ])
      const text = JSON.stringify({
        fields: reading.needed,
        glossary,
        adviceLanguage: reading.adviceLanguage,
        followUpLanguage: reading.followUpLanguage,
      })
      const hash = Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))),
        (b) => b.toString(16).padStart(2, '0'),
      ).join('')
      const claim = await rpc('claim_first_value_translation', {
        p_language: language,
        p_hash: hash,
        p_model: d.model,
      })
      if (claim.translation) return response({ translation: claim.translation })
      if (!claim.claimed) return pending()
      callId = claim.call_id
      const started = Date.now(),
        result = await d.translate(text, language)
      usage = {
        input_tokens: result.usage.inputTokens,
        output_tokens: result.usage.outputTokens,
        run_id: result.runId,
        duration_ms: Date.now() - started,
      }
      const translated: Record<string, string> = {}
      for (const field of readingFields)
        if (reading.needed[field]) {
          const value = result.output[field]?.trim()
          if (!value) throw new Error('invalid_output')
          translated[field] = value
        }
      try {
        await rpc('finish_first_value', { p_call: callId, p_result: translated, p_usage: usage })
      } catch {
        await rpc('finish_first_value', { p_call: callId, p_result: translated, p_usage: usage })
      }
      return response({ translation: translated })
    }
    if (!state.can_start)
      return state.task ? response(state) : response({ error: state.reason }, 403)
    const tag = typeof input.playerTag === 'string' ? normalizeTag(input.playerTag.trim()) : ''
    if (!/^[0289PYLQGRJCUV]{3,15}$/.test(tag)) return failure('invalid_tag', 400)
    const player = await d.game(tag, 'player')
    if (!player || normalizeTag(player.tag || '') !== tag || !Array.isArray(player.cards))
      return failure('player_not_found', 404)
    if (action === 'lookup') {
      await rpc('first_value_observe', { p_step: 'tag_found' })
      return response({
        player: {
          tag,
          name: player.name,
          trophies: player.trophies,
          currentDeck: player.currentDeck,
        },
      })
    }
    const ids = input.confirmedDeckIds
    if (
      ids !== undefined &&
      (!Array.isArray(ids) || ids.length !== 8 || !ids.every((id: unknown) => Number.isInteger(id)))
    )
      return response({ error: 'invalid' }, 400)
    const source = await resolveCoachingDeck(player, tag, () => d.game(tag, 'battles'), ids)
    if (source.kind === 'unavailable') return failure('deck_unavailable', 422)
    if (source.kind === 'confirm') return response({ deck_confirmation: { cards: source.cards } })
    const claim = await rpc('claim_first_value', {
      p_tag: tag,
      p_language: language,
      p_model: d.model,
    })
    if (!claim.claimed)
      return response(
        { ...(await rpc('first_value_state')), error: claim.reason ?? 'in_progress' },
        409,
      )
    callId = claim.call_id
    const started = Date.now()
    const result = await d.generate(
      `Choose exactly one card change for a one-match practice task using current deck and available collection, considering real levels. Return remove_id from deck and add_id from owned collection outside deck, concise reason, and one practice tip. Current deck: ${JSON.stringify(source.cards.map(coachingCard))}. Collection: ${JSON.stringify(player.cards.map(coachingCard))}.`,
      language,
    )
    usage = {
      input_tokens: result.usage.inputTokens,
      output_tokens: result.usage.outputTokens,
      run_id: result.runId,
      duration_ms: Date.now() - started,
    }
    const suggestion = result.output,
      removed = source.cards.find((c: any) => c.id === suggestion.remove_id),
      added = player.cards.find((c: any) => c.id === suggestion.add_id)
    if (
      !removed ||
      !added ||
      source.cards.some((c: any) => c.id === added.id) ||
      !suggestion.reason?.trim() ||
      !suggestion.practice?.trim()
    )
      throw new Error('invalid_output')
    const advice = formatCoachingAdvice(
      removed,
      added,
      player.cards,
      language,
      suggestion.reason,
      suggestion.practice,
    )
    const saved = {
      source_deck: source.cards,
      recommended_deck: source.cards.map((c: any) => (c.id === removed.id ? added : c)),
      recommendation: {
        ...suggestion,
        language,
        reason: advice.reason,
        practice: advice.practice,
        verified_swap: true,
      },
    }
    // A recording retry reuses the in-memory result, never the provider call.
    try {
      await rpc('finish_first_value', { p_call: callId, p_result: saved, p_usage: usage })
    } catch {
      await rpc('finish_first_value', { p_call: callId, p_result: saved, p_usage: usage })
    }
    return response(await rpc('first_value_state'))
  } catch (error) {
    if (callId) {
      await rpc('fail_first_value', {
        p_call: callId,
        p_code:
          error instanceof Error && error.message === 'invalid_output'
            ? 'invalid_output'
            : 'provider_or_record_unknown',
        p_usage: usage,
      }).catch(() => {})
      return pending()
    }
    return failure('service_unavailable', 503)
  }
}
