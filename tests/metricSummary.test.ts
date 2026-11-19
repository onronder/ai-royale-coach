import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { combineMeasured, measuredAverage, measuredRate } from '../src/lib/metricSummary';

describe('measured-only metrics (ERR29)', () => {
  it('ignores missing durations instead of counting them as 0 ms', () => {
    assert.deepEqual(measuredAverage([100, null, 300]), { average: 200, measured: 2, total: 3 });
  });
  it('reports unknown when nothing was measured', () => {
    assert.equal(measuredAverage([null, undefined]).average, null);
  });
  it('does not treat an unrecorded cache flag as a miss', () => {
    assert.deepEqual(measuredRate([true, null, false]), { average: 50, measured: 2, total: 3 });
    assert.equal(measuredRate([null, null]).average, null);
  });
  it('weights group averages by measured rows only', () => {
    const r = combineMeasured([{ average: 100, measured: 1, total: 5 }, { average: 400, measured: 3, total: 3 }]);
    assert.deepEqual(r, { average: 325, measured: 4, total: 8 });
  });
});
