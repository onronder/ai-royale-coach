import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applySummaryOff, summaryChecked, type SummaryState } from '../src/lib/trialSummaryChoice';
import { coachingTranslations } from '../src/i18n/coaching';

const base: SummaryState = { subscriptionId: 's', optedIn: true, playerTag: 'BBB', taskId: 'task-b', sent: false, trialEndsAt: '' };

describe('summary choice: two players, two tabs', () => {
  it("A's stale tab cannot remove B's current choice", () => {
    // Tab 1 showed A and was opted in; tab 2 then switched the choice to B.
    const after = applySummaryOff(base, 'AAA', 'task-a');
    assert.deepEqual(after, base);
    assert.equal(summaryChecked(after, 'BBB', 'task-b'), true);
    assert.equal(summaryChecked(after, 'AAA', 'task-a'), false);
  });
  it("B's own tab removes B's choice", () => {
    assert.equal(applySummaryOff(base, '#bbb', 'task-b').optedIn, false);
  });
  it('an old task of the same player does not count as the current choice', () => {
    assert.equal(summaryChecked(base, 'BBB', 'task-old'), false);
    assert.deepEqual(applySummaryOff(base, 'BBB', 'task-old'), base);
  });
});

describe('summary choice errors in five languages', () => {
  for (const lang of ['en', 'tr', 'es', 'fr', 'pt']) it(lang, () => {
    const c = (coachingTranslations as Record<string, Record<string, string>>)[lang];
    for (const k of ['summaryLoadError', 'summarySaveError', 'summaryStillOn', 'summaryRetry']) assert.ok(c?.[k], `${lang}.${k}`);
  });
  it('says the summary is still on in Turkish and offers Tekrar dene', () => {
    const tr = (coachingTranslations as Record<string, Record<string, string>>).tr;
    assert.match(tr.summaryStillOn, /hâlâ açık/); assert.equal(tr.summaryRetry, 'Tekrar dene');
  });
});
