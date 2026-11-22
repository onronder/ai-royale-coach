import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Coins, Layers, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCardName } from '@/i18n/useCardName';
import { savedDeckOptions } from '@/lib/playerQueries';
import { useUpgradeCollection } from '@/hooks/useUpgradeCollection';
import { calculateDeckUpgradePlan } from '@/lib/deckUpgradePlan';
import { upgradeStep, UPGRADE_COST_VERSION } from '@/lib/upgradeCost';
import { GAME_MAX_DISPLAY_LEVEL } from '../../../supabase/functions/_shared/card-display-level';
import type { ClashRoyaleCard } from '@/services/clashRoyaleApi';

const max = GAME_MAX_DISPLAY_LEVEL;
const levels = Array.from({ length: max }, (_, i) => i + 1);
const selectStyle = 'mt-1 block min-h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:ring-2 focus-visible:ring-ring';
function PlanSelect({ label, value, onChange, children }: {
  label: string; value: string | number; onChange: (value: string) => void; children: ReactNode;
}) {
  const id = useId();
  return <div className="min-w-0">
    <label htmlFor={id} className="text-sm font-medium">{label}</label>
    <select id={id} className={selectStyle} value={value} onChange={e => onChange(e.target.value)}>{children}</select>
  </div>;
}
const initial = { main: max, second: max, deck: '', priority: 0 };
function readDraft(key: string) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '{}');
    const level = (n: number) => levels.includes(n) ? n : max;
    return { main: level(v.main), second: level(v.second), deck: typeof v.deck === 'string' ? v.deck : '',
      priority: Number.isSafeInteger(v.priority) ? v.priority : 0 };
  } catch { return initial; }
}
function remember(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* The plan also works in memory. */ }
}

export default function UpgradePlan({ account, tag, cards }: { account: string; tag: string; cards: ClashRoyaleCard[] }) {
  const { t, i18n } = useTranslation();
  const cardName = useCardName();
  const number = (n: number | null) => n === null ? t('common.unknown') : n.toLocaleString(i18n.language);
  const key = 'deck-upgrade:' + account + ':' + tag;
  const [draft, setDraft] = useState(() => readDraft(key));
  function edit(change: Partial<typeof initial>) {
    const next = { ...draft, ...change };
    setDraft(next);
    remember(key, next);
  }
  const saved = useQuery(savedDeckOptions(account, tag));
  const collection = useUpgradeCollection(account, tag);
  const deck = saved.data?.find(d => d.id === draft.deck);
  // Keep unresolved references in their original slots, including malformed legacy entries.
  const secondRefs = Array.isArray(deck?.cards)
    ? deck.cards.map(c => typeof c === 'string' || typeof c === 'number' ? c : '') : [];
  const ids = cards.map(c => c.id);
  const plan = calculateDeckUpgradePlan(collection.snapshot, { cards: ids, targetLevel: draft.main },
    deck && { cards: secondRefs, targetLevel: draft.second });
  const primary = plan.status === 'ready' ? { rows: plan.rows, gold: plan.gold.main } : 'mainPlan' in plan ? plan.mainPlan : null;
  const comparison = !!deck && plan.status === 'ready';
  const unresolvedSelection = !!draft.deck && !deck;
  const asOf = 'asOf' in plan ? plan.asOf : null;
  const outdated = ('freshness' in plan && plan.freshness === 'previous') || collection.failed;
  const [changed, setChanged] = useState(false);
  const signature = JSON.stringify([UPGRADE_COST_VERSION, ids, secondRefs]);
  useEffect(() => {
    if (!asOf || outdated || unresolvedSelection) return;
    // Keep the last deck composition, never stock or prices, across visits.
    const signatureKey = key + ':composition';
    try {
      const last = JSON.parse(localStorage.getItem(signatureKey) || 'null');
      if (last?.deck === draft.deck && last.signature !== signature) setChanged(true);
      remember(signatureKey, { deck: draft.deck, signature });
    } catch { /* Storage is optional. */ }
  }, [key, draft.deck, signature, asOf, outdated, unresolvedSelection]);

  const rows = primary?.rows ?? [];
  const unfinished = rows.filter(r => r.level === null || r.level < Math.max(r.mainTarget ?? 0, r.secondTarget ?? 0));
  const extraCopies = rows.filter(row => row.additional.missingCopies !== 0);
  const completed = rows.filter(r => !unfinished.includes(r));
  const catalog = new Map(collection.knownCards.map(c => [c.card_id, c]));
  const shared = unfinished.filter(r => r.sharedNextUpgrade === true).map(r => {
    const owned = catalog.get(r.cardId);
    const step = owned && upgradeStep(owned.rarity, r.level! + 1);
    return { row: r, enough: !!(step && owned?.card_count != null && owned.card_count >= step[0]), gold: step?.[1] ?? Infinity };
  }).sort((a, b) => Number(b.row.cardId === draft.priority) - Number(a.row.cardId === draft.priority) ||
    Number(b.enough) - Number(a.enough) || a.gold - b.gold);
  const first = shared[0]?.row;
  const levelField = (field: 'main' | 'second', label: string) =>
    <PlanSelect label={label} value={draft[field]} onChange={value => edit({ [field]: Number(value) })}>
      {levels.map(n => <option key={n} value={n}>{n}</option>)}
    </PlanSelect>;
  const amount = (label: string, sum: { total: number | null; known: number }) =>
    <div className="min-w-0 rounded-lg border border-border bg-muted/20 p-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-xl font-bold tabular-nums">{sum.total === null ? t('common.unknown') : t('upgradePlan.gold', { amount: number(sum.total) })}</dd>
      {sum.total === null && <dd className="text-sm text-muted-foreground">{t('upgradePlan.subtotal', { amount: number(sum.known) })}</dd>}
    </div>;
  const cardRow = (row: typeof rows[number]) => <li key={row.cardId} className="space-y-1 border-b border-border/60 py-3 last:border-0">
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <strong className="break-words">{cardName(row.name)}</strong>
      <span className="text-sm text-muted-foreground">{t('upgradePlan.level', { current: number(row.level), target: Math.max(row.mainTarget ?? 0, row.secondTarget ?? 0) })}</span>
    </div>
    {comparison && <p className="text-xs font-medium">{row.mainTarget && row.secondTarget
      ? t('upgradePlan.bothDecks') : row.mainTarget ? t('upgradePlan.mainDeck') : t('upgradePlan.secondDeck')}</p>}
    {row.sharedNextUpgrade === true && <p className="text-sm text-primary">{t('upgradePlan.sharedStep', { level: row.level! + 1 })}</p>}
    {comparison && row.level !== null && row.secondTarget !== null && row.level < row.secondTarget &&
      row.level >= (row.mainTarget ?? 0) &&
      <p className="text-sm">{t('upgradePlan.secondStep', { from: row.level, to: row.level + 1 })}</p>}
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
      {row.mainTarget && <span>{t('upgradePlan.mainMissing', { amount: number(row.main.missingCopies) })}</span>}
      {comparison && <span>{t('upgradePlan.extraMissing', { amount: number(row.additional.missingCopies) })}</span>}
    </div>
    {row.level !== null && row.combined.gold === null && <p className="text-sm text-muted-foreground">{t('upgradePlan.unpriced')}</p>}
    {row.combined.missingCopies === null && row.combined.copies !== null &&
      <p className="text-sm text-muted-foreground">{t('upgradePlan.gross', { amount: number(row.combined.copies) })}</p>}
  </li>;
  const settings = useRef<HTMLDetailsElement>(null);
  const art = first && cards.find(card => card.id === first.cardId)?.iconUrls?.medium;
  const disclosure = 'flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-semibold focus-visible:outline-primary [&::-webkit-details-marker]:hidden';
  const arrow = <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground group-open:rotate-180" />;
  return <section aria-label={t('upgradePlan.title')} className="min-w-0 space-y-3">
    <div className="rounded-xl border border-border bg-card px-4">
      <details className="group" ref={settings}>
        <summary className={disclosure}>
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-left">
            <span>{t('upgradePlan.deckTarget', { deck: t('upgradePlan.mainDeck'), level: draft.main })}</span>
            {draft.deck && <span className="min-w-0 break-words"><span aria-hidden="true" className="mr-2 text-muted-foreground">/</span>
              {t('upgradePlan.deckTarget', { deck: deck?.name ?? t('upgradePlan.selectedDeck'), level: draft.second })}</span>}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-primary"><Pencil aria-hidden="true" size={14} />{t(!draft.deck && saved.data?.length ? 'upgradePlan.addDeck' : 'upgradePlan.edit')}</span>
        </summary>
        <div className="grid gap-3 border-t border-border py-3 sm:grid-cols-2">
          {levelField('main', t('upgradePlan.mainLevel'))}
          <PlanSelect label={t('upgradePlan.secondDeck')} value={draft.deck}
            onChange={deck => { setChanged(false); edit({ deck, priority: 0 }); }}>
            <option value="">{t('upgradePlan.none')}</option>
            {unresolvedSelection && <option value={draft.deck}>{t('upgradePlan.selectedDeck')}</option>}
            {saved.data?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </PlanSelect>
          {draft.deck && levelField('second', t('upgradePlan.secondLevel'))}
          {shared.length > 1 && <PlanSelect label={t('upgradePlan.priority')}
            value={shared.some(c => c.row.cardId === draft.priority) ? draft.priority : 0}
            onChange={priority => edit({ priority: Number(priority) })}>
            <option value={0}>{t('upgradePlan.automatic')}</option>
            {shared.map(({ row }) => <option key={row.cardId} value={row.cardId}>{cardName(row.name)}</option>)}
          </PlanSelect>}
          <Button variant="secondary" className="min-h-11 sm:col-span-2" onClick={() => {
            if (settings.current) {
              settings.current.open = false;
              settings.current.querySelector('summary')?.focus();
            }
          }}>{t('upgradePlan.viewPlan')}</Button>
        </div>
      </details>
    </div>
    {saved.isError ? <div role="status">{t('upgradePlan.savedError')} <Button variant="outline" size="sm" onClick={() => void saved.refetch()}>{t('common.retry')}</Button></div>
      : unresolvedSelection ? <p role="status">{t(saved.isPending ? 'common.loading' : 'upgradePlan.deletedDeck')}</p>
      : saved.isSuccess && !saved.data.length && <div className="text-sm">
        <p>{t('upgradePlan.noSaved')}</p>
        <Link to="?tab=deck&subtab=builder" state={{ returnToUpgradePlan: { account, tag } }}
          className="inline-flex min-h-11 items-center font-semibold text-primary underline">{t('deck.builder')}</Link>
      </div>}
    {asOf && outdated && <p className="text-sm text-muted-foreground">{t('upgradePlan.previous', {
      when: new Date(asOf).toLocaleString(i18n.language),
    })}</p>}
    {changed && <p role="status">{t('upgradePlan.changed')}</p>}
    {(collection.failed || plan.status === 'unavailable' || plan.status === 'waiting' || outdated) &&
      <div role="status" className="flex flex-wrap items-center gap-2 text-sm">
        {t(collection.failed || plan.status === 'unavailable' || ['failed', 'cancelled'].includes(collection.snapshot.sync?.status ?? '')
          ? 'upgradePlan.readError' : collection.noSync ? 'upgradePlan.noSync' : 'upgradePlan.waiting')}
        {!collection.loading && <Button className="min-h-11" variant="outline" onClick={() => void collection.refresh()}>{t('upgradePlan.reread')}</Button>}
      </div>}
    {plan.status === 'invalid' && <p role="status" className="rounded-md border border-border p-3">
      {t('upgradePlan.' + (plan.error === 'invalid_size' ? 'invalidSize' : plan.error === 'duplicate_card' ? 'duplicate' : 'missing'), {
        deck: t(plan.deck === 'main' ? 'upgradePlan.mainDeck' : 'upgradePlan.secondDeck'),
        slot: (plan.slot ?? 0) + 1,
        card: typeof plan.reference === 'number' ? cardName(cards.find(c => c.id === plan.reference)?.name ?? String(plan.reference))
          : plan.reference ? cardName(plan.reference) : t('common.unknown'),
      })}
    </p>}
    {comparison && plan.status === 'ready' ? <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <section aria-label={t('upgradePlan.extraCost')} className="bg-gradient-to-br from-gold/10 to-transparent p-4 sm:p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Coins size={18} aria-hidden="true" className="text-gold" />{t('upgradePlan.extraCost')}</h3>
        <p className="mt-1 break-words text-3xl font-bold tracking-tight text-gold tabular-nums">
          {plan.gold.additional.total === null ? t('common.unknown') : t('upgradePlan.gold', { amount: number(plan.gold.additional.total) })}
        </p>
        {plan.gold.additional.total === null && <p className="text-sm">{t('upgradePlan.subtotal', { amount: number(plan.gold.additional.known) })}</p>}
      </section>
      <section aria-label={t('upgradePlan.nextShared')} className="flex items-center gap-3 border-t border-border p-4 sm:p-5">
        {first && <div aria-hidden="true" className="relative grid h-16 w-14 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Layers size={22} />{art && <img key={art} src={art} alt="" className="absolute inset-0 h-full w-full object-contain"
            onError={e => { e.currentTarget.hidden = true; }} />}
        </div>}
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-muted-foreground">{t('upgradePlan.nextShared')}</h3>
          <p className={first ? 'mt-1 break-words text-xl font-bold' : 'mt-1 text-sm'}>
            {first ? <>{cardName(first.name)} <span className="whitespace-nowrap text-primary">{first.level} → {first.level! + 1}</span></>
              : t(plan.sharedNextUpgrade === null ? 'upgradePlan.unknownShared' : 'upgradePlan.noShared')}
          </p>
        </div>
      </section>
    </div> : primary && <dl>{amount(t('upgradePlan.mainCost'), primary.gold)}</dl>}
    {comparison && <details className="group rounded-xl border border-border bg-card px-4">
      <summary className={disclosure}>{t('upgradePlan.copiesToCollect')}{arrow}</summary>
      <div className="border-t border-border py-3">
        {extraCopies.length ? <ul className="space-y-1 text-sm">{extraCopies.map(row =>
          <li key={row.cardId}>{row.additional.missingCopies === null
            ? t('upgradePlan.unknownCopies', { card: cardName(row.name) })
            : t(row.additional.missingCopies === 1 ? 'upgradePlan.collect_one' : 'upgradePlan.collect_other',
              { card: cardName(row.name), amount: number(row.additional.missingCopies) })}</li>
        )}</ul> : <p className="text-sm">{t('upgradePlan.noExtraCopies')}</p>}
      </div>
    </details>}
    {primary && <details className="group rounded-xl border border-border bg-card px-4">
      <summary className={disclosure}>{t('upgradePlan.breakdown')}{arrow}</summary>
      <div className="space-y-3 border-t border-border py-3">
        {comparison && plan.status === 'ready' && <dl className="grid gap-2 sm:grid-cols-2">
          {amount(t('upgradePlan.mainCost'), primary.gold)}
          {amount(t('upgradePlan.totalCost'), plan.gold.combined)}
        </dl>}
        <p className="text-sm text-muted-foreground">{t('upgradePlan.scope', { tag })}</p>
        {asOf && !outdated && <p className="text-sm text-muted-foreground">{t('upgradePlan.observed', {
          when: new Date(asOf).toLocaleString(i18n.language),
        })}</p>}
        {!!unfinished.length && <ul aria-label={t('upgradePlan.cards')}>{unfinished.map(cardRow)}</ul>}
        {!!completed.length && <details><summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{t('upgradePlan.completed', { amount: completed.length })}</summary>
          <ul>{completed.map(cardRow)}</ul>
        </details>}
      </div>
    </details>}
  </section>;
}
