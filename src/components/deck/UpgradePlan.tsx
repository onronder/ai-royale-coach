import { type ReactNode, useEffect, useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
  const amount = (label: string, sum: { total: number | null; known: number }, accent = false) =>
    <div className={'min-w-0 rounded-lg border p-3 ' + (accent ? 'border-gold/50 bg-gold/5' : 'border-border bg-muted/20')}>
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
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
      {row.mainTarget && <span>{t('upgradePlan.mainMissing', { amount: number(row.main.missingCopies) })}</span>}
      {comparison && <span>{t('upgradePlan.extraMissing', { amount: number(row.additional.missingCopies) })}</span>}
    </div>
    {row.level !== null && row.combined.gold === null && <p className="text-sm text-muted-foreground">{t('upgradePlan.unpriced')}</p>}
    {row.combined.missingCopies === null && row.combined.copies !== null &&
      <p className="text-sm text-muted-foreground">{t('upgradePlan.gross', { amount: number(row.combined.copies) })}</p>}
  </li>;
  return <section aria-label={t('upgradePlan.title')} className="mt-4 min-w-0 space-y-4">
    <p className="text-sm text-muted-foreground">{t('upgradePlan.scope', { tag })}</p>
    <div className="grid items-end gap-3 sm:grid-cols-3">
      {levelField('main', t('upgradePlan.mainLevel'))}
      <PlanSelect label={t('upgradePlan.secondDeck')} value={draft.deck}
        onChange={deck => { setChanged(false); edit({ deck, priority: 0 }); }}>
        <option value="">{t('upgradePlan.none')}</option>
        {unresolvedSelection && <option value={draft.deck}>{t('upgradePlan.selectedDeck')}</option>}
        {saved.data?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </PlanSelect>
      {draft.deck && levelField('second', t('upgradePlan.secondLevel'))}
    </div>
    {saved.isError ? <div role="status">{t('upgradePlan.savedError')} <Button variant="outline" size="sm" onClick={() => void saved.refetch()}>{t('common.retry')}</Button></div>
      : unresolvedSelection ? <p role="status">{t(saved.isPending ? 'common.loading' : 'upgradePlan.deletedDeck')}</p>
      : saved.isSuccess && !saved.data.length && <p className="text-sm text-muted-foreground">{t('upgradePlan.noSaved')}</p>}
    {asOf && <p className="text-sm text-muted-foreground">{t(outdated ? 'upgradePlan.previous' : 'upgradePlan.observed', {
      when: new Date(asOf).toLocaleString(i18n.language),
    })}</p>}
    {changed && <p role="status">{t('upgradePlan.changed')}</p>}
    {(collection.failed || plan.status === 'unavailable' || plan.status === 'waiting' || outdated) &&
      <div role="status" className="flex flex-wrap items-center gap-2 text-sm">
        {t(collection.failed || plan.status === 'unavailable' || ['failed', 'cancelled'].includes(collection.snapshot.sync?.status ?? '')
          ? 'upgradePlan.readError' : collection.noSync ? 'upgradePlan.noSync' : 'upgradePlan.waiting')}
        {!collection.loading && <Button className="min-h-11" variant="outline" onClick={() => void collection.refresh()}>{t('upgradePlan.reread')}</Button>}
      </div>}
    {primary && <dl aria-label={t('upgradePlan.title')} className="grid gap-2 sm:grid-cols-3">
      {amount(t('upgradePlan.mainCost'), primary.gold)}
      {comparison && plan.status === 'ready' && <>
        {amount(t('upgradePlan.extraCost'), plan.gold.additional, true)}
        {amount(t('upgradePlan.totalCost'), plan.gold.combined)}
      </>}
    </dl>}
    {plan.status === 'invalid' && <p role="status" className="rounded-md border border-border p-3">
      {t('upgradePlan.' + (plan.error === 'invalid_size' ? 'invalidSize' : plan.error === 'duplicate_card' ? 'duplicate' : 'missing'), {
        deck: t(plan.deck === 'main' ? 'upgradePlan.mainDeck' : 'upgradePlan.secondDeck'),
        slot: (plan.slot ?? 0) + 1,
        card: typeof plan.reference === 'number' ? cardName(cards.find(c => c.id === plan.reference)?.name ?? String(plan.reference))
          : plan.reference ? cardName(plan.reference) : t('common.unknown'),
      })}
    </p>}
    {comparison && plan.status === 'ready' && <div className="rounded-lg border border-border p-3">
      <h4 className="font-semibold">{t('upgradePlan.nextShared')}</h4>
      <p className="mt-1">{first ? cardName(first.name) + ' · ' + first.level + ' → ' + (first.level! + 1)
        : t(plan.sharedNextUpgrade === null ? 'upgradePlan.unknownShared' : 'upgradePlan.noShared')}</p>
      {shared.length > 1 && <PlanSelect label={t('upgradePlan.priority')}
        value={shared.some(c => c.row.cardId === draft.priority) ? draft.priority : 0}
        onChange={priority => edit({ priority: Number(priority) })}>
        <option value={0}>{t('upgradePlan.automatic')}</option>
        {shared.map(({ row }) => <option key={row.cardId} value={row.cardId}>{cardName(row.name)}</option>)}
      </PlanSelect>}
    </div>}
    {!!unfinished.length && <ul aria-label={t('upgradePlan.cards')}>{unfinished.map(cardRow)}</ul>}
    {!!completed.length && <details><summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{t('upgradePlan.completed', { amount: completed.length })}</summary>
      <ul>{completed.map(cardRow)}</ul>
    </details>}
  </section>;
}
