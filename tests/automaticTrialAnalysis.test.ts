import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { firstTrialAnalysisTag } from './automaticTrialAnalysis';

const trial = { status: 'trialing', isTrialActive: true, hasPreviousUsage: false, playerTags: ['ABC123'] };
describe('automatic first trial analysis', () => {
  it('starts immediately for a live Polar trial with a linked player', () => {
    assert.equal(firstTrialAnalysisTag(trial), 'ABC123');
  });
  it('does not automatically use another allowance after any previous AI usage', () => {
    assert.equal(firstTrialAnalysisTag({ ...trial, hasPreviousUsage: true }), null);
  });
  it('waits until the player links an account', () => {
    assert.equal(firstTrialAnalysisTag({ ...trial, playerTags: [] }), null);
  });
  it('never starts for an expired trial', () => {
    assert.equal(firstTrialAnalysisTag({ ...trial, isTrialActive: false }), null);
  });
  it('never starts for a non-Polar subscription', () => {
    assert.equal(firstTrialAnalysisTag({ ...trial, status: null }), null);
  });
});