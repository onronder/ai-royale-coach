import { useJourneyMeasurement } from '@/hooks/useJourneyMeasurement'
import { useContext, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Loader2, ShieldCheck, Swords } from 'lucide-react'
import { SubscriptionUserContext, useSubscription } from '@/hooks/useSubscription'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { PricingModal } from '@/components/subscription/PricingModal'
import { SplashScreen } from '@/components/ui/splash-screen'
import { LanguageSelector } from '@/components/layout/LanguageSelector'
import { DeckTransfer } from '@/components/coaching/DeckTransfer'
import { useCardName } from '@/i18n/useCardName'
import { coachingReading, readingText } from '../../supabase/functions/_shared/coaching-reading'
import {
  firstValueAction,
  getFirstValue,
  observeFirstValue,
  FirstValueError,
  FEEDBACK_REASONS,
  type FirstValueResponse,
} from '@/lib/firstValue'
import { recordAcquisitionStep } from '@/lib/acquisitionSteps'
import { coachingReturnTag } from '@/lib/coachingReturnTag'

export default function FirstCoaching() {
  const [params] = useSearchParams()
  const initialTag = coachingReturnTag(params.get('player'))
  const { t, i18n } = useTranslation(),
    lang = i18n.resolvedLanguage || 'en',
    cardName = useCardName()
  const userId = useContext(SubscriptionUserContext),
    sub = useSubscription(),
    qc = useQueryClient()
  const key = ['first-value', userId]
  const q = useQuery({
    queryKey: key,
    queryFn: getFirstValue,
    enabled: !!userId,
    retry: false,
    staleTime: 0,
  })
  const [tag, setTag] = useState(''),
    [player, setPlayer] = useState<FirstValueResponse['player']>(),
    [confirmation, setConfirmation] = useState<FirstValueResponse['deck_confirmation']>()
  const [busy, setBusy] = useState<string | null>(null),
    [error, setError] = useState(''),
    [pricing, setPricing] = useState(false),
    [survey, setSurvey] = useState(false),
    [thanks, setThanks] = useState(false)
  const adviceRoot = useRef<HTMLDivElement>(null),
    offerRoot = useRef<HTMLDivElement>(null)
  const offerSeen = useRef<string | null>(null),
    wasAway = useRef(false),
    returnCheck = useRef(0)
  const shown = useRef<string | null>(null),
    restored = useRef<string | null>(null)
  const task = q.data?.task,
    reading = task?.recommendation ? coachingReading(task, lang) : null
  const refetchState = q.refetch
  const tr = useQuery({
    queryKey: ['first-value-translation', userId, task?.id, lang],
    enabled: !!reading && Object.keys(reading.needed).length > 0 && !!q.data?.can_read,
    queryFn: async () => (await firstValueAction('translate', lang)).translation,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  })
  const words = reading ? readingText(reading, tr.data) : null
  const beginJourney = useJourneyMeasurement('free_coaching', (userId || '') + ':' + lang,
    !!task?.recommendation && !!words?.reason && !!words?.practice && !busy, tr.isError)
  useEffect(() => {
    if (!userId || restored.current === userId) return
    restored.current = userId
    setPlayer(undefined)
    setConfirmation(undefined)
    setError('')
    setSurvey(false)
    setThanks(false)
    try {
      setTag(
        initialTag ||
          localStorage.getItem('first-value-tag:' + userId) ||
          localStorage.getItem('pending_player_tag') ||
          '',
      )
    } catch {
      /* optional draft */
    }
  }, [userId, initialTag])
  useEffect(() => {
    if (userId && q.data && (q.data.reason === 'open' || q.data.can_read))
      observeFirstValue('screen_seen')
  }, [userId, q.data])
  useEffect(() => {
    if (!userId || !q.data || offerSeen.current === userId || !offerRoot.current) return
    const observe = () => {
      if (
        document.visibilityState !== 'visible' ||
        offerSeen.current === userId ||
        !offerRoot.current
      )
        return
      const box = offerRoot.current.getBoundingClientRect()
      if (box.bottom <= 0 || box.top >= window.innerHeight) return
      offerSeen.current = userId
      observeFirstValue('offer_seen')
      recordAcquisitionStep('trial_offer_seen')
    }
    const observer = new IntersectionObserver(observe)
    observer.observe(offerRoot.current)
    observe()
    document.addEventListener('visibilitychange', observe)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', observe)
    }
  }, [userId, q.data])
  useEffect(() => {
    if (
      !task?.recommendation ||
      task.shown_at ||
      shown.current === task.id ||
      !words?.reason ||
      tr.isError
    )
      return
    const mark = () => {
      if (
        shown.current === task.id ||
        document.visibilityState !== 'visible' ||
        !adviceRoot.current
      )
        return
      const box = adviceRoot.current.getBoundingClientRect()
      if (box.bottom <= 0 || box.top >= window.innerHeight) return
      shown.current = task.id
      void firstValueAction('shown', lang)
        .then(() => refetchState())
        .catch(() => {
          shown.current = null
        })
    }
    const observer = new IntersectionObserver(mark)
    if (adviceRoot.current) observer.observe(adviceRoot.current)
    mark()
    document.addEventListener('visibilitychange', mark)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', mark)
    }
  }, [
    task?.id,
    task?.shown_at,
    task?.recommendation,
    words?.reason,
    tr.isError,
    lang,
    refetchState,
  ])
  useEffect(() => {
    if (!task?.shown_at || task.battle_result) return
    const onReturn = () => {
      if (document.visibilityState !== 'visible') {
        wasAway.current = true
        return
      }
      if (!wasAway.current || busy) return
      wasAway.current = false
      if (Date.now() - returnCheck.current < 30000) return
      returnCheck.current = Date.now()
      setBusy('check')
      void firstValueAction('check', lang)
        .then((result) => qc.setQueryData(['first-value', userId], result))
        .catch(() => setError('service_unavailable'))
        .finally(() => setBusy(null))
    }
    document.addEventListener('visibilitychange', onReturn)
    return () => document.removeEventListener('visibilitychange', onReturn)
  }, [userId, task?.id, task?.shown_at, task?.battle_result, lang, busy, qc])
  const changeTag = (value: string) => {
    setTag(value)
    setPlayer(undefined)
    setConfirmation(undefined)
    if (userId)
      try {
        localStorage.setItem('first-value-tag:' + userId, value)
      } catch {
        /* optional draft */
      }
  }
  const run = async (action: string) => {
    const measurement = action === 'start' ? beginJourney('manual') : null
    setError('')
    setBusy(action)
    try {
      const result = await firstValueAction(action, lang, {
        playerTag: player?.tag || tag.trim(),
        ...(confirmation ? { confirmedDeckIds: confirmation.cards.map((c) => c.id) } : {}),
      })
      if (measurement) {
        if (result.deck_confirmation) measurement.complete('needs_input')
        else if (result.task?.recommendation) measurement.ready()
        else measurement.complete('failed')
      }
      if (result.player) setPlayer(result.player)
      if (result.deck_confirmation) setConfirmation(result.deck_confirmation)
      if (result.reason) qc.setQueryData(key, result)
      if (action === 'start' && result.task) {
        try {
          localStorage.removeItem('pending_player_tag')
        } catch {
          /* optional draft */
        }
      }
    } catch (e) {
      measurement?.complete('failed')
      setError(e instanceof FirstValueError ? e.code : 'service_unavailable')
      if (action === 'start') void q.refetch()
    } finally {
      setBusy(null)
    }
  }
  const decline = async () => {
    observeFirstValue('declined')
    const { data, error } = await supabase.rpc('first_value_feedback', { p_reason: null })
    if (!error && data) setSurvey(true)
  }
  const answer = async (reason: string) => {
    const { error } = await supabase.rpc('first_value_feedback', { p_reason: reason })
    if (error) {
      setError('service_unavailable')
      return
    }
    setSurvey(false)
    setThanks(true)
  }
  if (userId === undefined || sub.isLoading || q.isLoading) return <SplashScreen />
  if (!userId) return <Navigate to="/auth" replace />
  if (sub.hasAccess || sub.subscriptionStatus || sub.hasUsedTrial)
    return <Navigate to="/select-player?skipFirstValue=1" replace />
  const canShow = q.data && (q.data.reason === 'open' || q.data.can_read)
  return (
    <main className="mx-auto min-h-dvh max-w-2xl space-y-6 px-4 py-6 pb-16">
      <header className="flex items-center justify-between gap-4">
        <Link to="/" className="font-rajdhani text-xl font-bold">
          AI ROYALE
        </Link>
        <LanguageSelector />
      </header>
      <div>
        <p className="mb-2 flex items-center gap-2 text-sm text-primary">
          <ShieldCheck className="h-4 w-4" />
          {t('firstValue.noCard')}
        </p>
        <h1 className="font-rajdhani text-3xl font-bold">{t('firstValue.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('firstValue.intro')}</p>
      </div>
      {q.isError && (
        <Card>
          <CardContent className="pt-6" role="alert">
            <p>{t('firstValue.errors.service_unavailable')}</p>
            <Button onClick={() => q.refetch()}>{t('firstValue.retry')}</Button>
          </CardContent>
        </Card>
      )}
      {q.data && !canShow && <p role="status">{t(`firstValue.errors.${q.data.reason}`)}</p>}
      {canShow && !task && (
        <Card>
          <CardHeader>
            <CardTitle>{t('firstValue.findPlayer')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <details open className="rounded-lg bg-muted/40 p-4">
              <summary className="cursor-pointer font-semibold">
                {t('selectPlayer.tagGuideTitle')}
              </summary>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
                <li>{t('selectPlayer.tagGuideOpen')}</li>
                <li>{t('selectPlayer.tagGuideCopy')}</li>
                <li>{t('selectPlayer.tagGuidePaste')}</li>
              </ol>
              <a
                className="mt-2 inline-flex min-h-11 items-center text-primary underline"
                href={`https://support.supercell.com/clash-royale/${['en', 'tr', 'es', 'fr', 'pt'].includes(lang) ? lang : 'en'}/articles/player-tag.html`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => observeFirstValue('tag_help')}
              >
                {t('firstValue.tagHelp')}
              </a>
            </details>
            <p id="tag-note" className="text-sm text-muted-foreground">
              {t('firstValue.noPassword')}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void run('lookup')
              }}
              className="space-y-3"
            >
              <Label htmlFor="first-tag">{t('selectPlayer.playerTagLabel')}</Label>
              <Input
                id="first-tag"
                aria-describedby="tag-note"
                value={tag}
                onChange={(e) => changeTag(e.target.value)}
                placeholder="#…"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                disabled={!!busy}
              />
              <Button type="submit" className="min-h-11" disabled={!!busy || !tag.trim()}>
                {t('firstValue.findPlayer')}
              </Button>
            </form>
            {player && (
              <div className="space-y-3 rounded-lg border p-4">
                <h2 className="font-semibold">
                  {player.name} · #{player.tag}
                </h2>
                <p>
                  {new Intl.NumberFormat(lang).format(player.trophies)} {t('firstValue.trophies')}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {(confirmation?.cards || player.currentDeck || []).map((c) => (
                    <div key={c.id} className="text-center">
                      <img src={c.iconUrls?.medium} alt="" className="mx-auto h-16" />
                      <span className="text-xs">{cardName(c.name)}</span>
                    </div>
                  ))}
                </div>
                <p>{t(confirmation ? 'firstValue.confirmDeck' : 'firstValue.confirmPlayer')}</p>
                <Button
                  className="h-auto min-h-11 w-full whitespace-normal"
                  disabled={!!busy}
                  onClick={() => run('start')}
                >
                  {t('firstValue.generate')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {canShow && task && !task.recommendation && (
        <Card>
          <CardContent className="space-y-3 pt-6" role="status">
            <p>{t(q.data?.outcome === 'failed' ? 'firstValue.errors.failed' : 'firstValue.errors.uncertain')}</p>
            {q.data?.outcome !== 'failed' && (
              <Button variant="outline" onClick={() => q.refetch()}>
                {t('firstValue.reloadResult')}
              </Button>
            )}
            <a className="block text-primary underline" href="mailto:support@fittechs.com">
              support@fittechs.com
            </a>
          </CardContent>
        </Card>
      )}
      {canShow && task?.recommendation && (
        <Card ref={adviceRoot}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords />
              {t('firstValue.yourAdvice')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {reading && <p className="font-semibold">{reading.facts}</p>}
            {tr.isPending && tr.fetchStatus === 'fetching' ? (
              <p role="status">{t('firstValue.loading')}</p>
            ) : (
              <>
                <p>{words?.reason}</p>
                <p className="rounded-lg bg-primary/10 p-4">{words?.practice}</p>
              </>
            )}
            {tr.isError && (
              <div role="alert">
                <p>{t('firstValue.translationError')}</p>
                <Button variant="outline" onClick={() => tr.refetch()}>
                  {t('firstValue.reloadResult')}
                </Button>
              </div>
            )}
            <DeckTransfer cards={task.recommended_deck} playerTag={task.player_tag} />
            {task.battle_result ? (
              <div className="rounded-lg border p-4" role="status">
                <h2 className="font-semibold">{t('firstValue.result')}</h2>
                <p>
                  {t(`coaching.${task.battle_result.outcome}`)} ·{' '}
                  {task.battle_result.score.join('–')}
                </p>
                {task.battle_result.trophy_change !== null && (
                  <p>{t('firstValue.trophyChange', { count: task.battle_result.trophy_change })}</p>
                )}
                <p className="mt-2 text-sm text-muted-foreground">{t('firstValue.resultNote')}</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{t('firstValue.matchNote')}</p>
                <Button
                  variant="outline"
                  className="min-h-11"
                  disabled={!!busy}
                  onClick={() => run('check')}
                >
                  {t('firstValue.checkMatch')}
                </Button>
                {task.last_checked_at && <p role="status">{t('firstValue.noMatch')}</p>}
              </>
            )}
          </CardContent>
        </Card>
      )}
      {busy && (
        <p role="status" className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('firstValue.loading')}
        </p>
      )}
      {error && (
        <div className="rounded-lg border border-destructive/40 p-4" role="alert">
          {t(`firstValue.errors.${error}`, {
            defaultValue: t('firstValue.errors.service_unavailable'),
          })}
        </div>
      )}
      <Card ref={offerRoot}>
        <CardHeader>
          <CardTitle>{t('firstValue.continueTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('firstValue.continueNote')}</p>
          <Button
            className="h-auto min-h-11 w-full whitespace-normal"
            onClick={() => {
              recordAcquisitionStep('trial_start_clicked')
              setPricing(true)
            }}
          >
            {t('firstValue.startTrial')}
          </Button>
          {canShow && (
            <Button variant="ghost" className="min-h-11 w-full" onClick={decline}>
              {t('firstValue.notNow')}
            </Button>
          )}
        </CardContent>
      </Card>
      {survey && (
        <Card>
          <CardContent className="space-y-2 pt-6">
            <h2 className="font-semibold">{t('firstValue.question')}</h2>
            <p className="text-sm text-muted-foreground">{t('firstValue.optional')}</p>
            {FEEDBACK_REASONS.map((r) => (
              <Button
                key={r}
                variant="outline"
                className="h-auto min-h-11 w-full whitespace-normal"
                onClick={() => answer(r)}
              >
                {t(`firstValue.reasons.${r}`)}
              </Button>
            ))}
            <Button variant="ghost" onClick={() => setSurvey(false)}>
              {t('firstValue.skip')}
            </Button>
          </CardContent>
        </Card>
      )}
      {thanks && <p role="status">{t('firstValue.thanks')}</p>}
      <footer className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <Link to="/settings/email">{t('firstValue.preferences')}</Link>
        <Link to="/privacy">{t('firstValue.privacy')}</Link>
      </footer>
      <PricingModal open={pricing} onOpenChange={setPricing} />
    </main>
  )
}
