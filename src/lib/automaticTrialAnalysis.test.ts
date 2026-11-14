import { describe, it, expect } from 'bun:test';
import { firstTrialAnalysisTag } from './automaticTrialAnalysis';

const trial = { status: 'trialing', isTrialActive: true, hasPreviousUsage: false, playerTags: ['ABC123'] };
describe('automatic first trial analysis', () => {
  it('starts immediately for a live Polar trial with a linked player', () => {
    expect(firstTrialAnalysisTag(trial)).toBe('ABC123');
  });
  it('does not automatically use another allowance after any previous AI usage', () => {
    expect(firstTrialAnalysisTag({ ...trial, hasPreviousUsage: true })).toBeNull();
  });
  it('waits until the player links an account', () => {
    expect(firstTrialAnalysisTag({ ...trial, playerTags: [] })).toBeNull();
  });
  it('never starts for an expired trial', () => {
    expect(firstTrialAnalysisTag({ ...trial, isTrialActive: false })).toBeNull();
  });
  it('never starts for a non-Polar subscription', () => {
    expect(firstTrialAnalysisTag({ ...trial, status: null })).toBeNull();
  });
});