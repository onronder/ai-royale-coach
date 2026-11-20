import { test, expect } from 'bun:test';
import { operationPollInterval } from '../src/lib/operationPolling';
test('operation fallback stops when idle, slows only with a healthy connection', () => {
  expect(operationPollInterval(false, true, 2000)).toBe(false);
  expect(operationPollInterval(false, false, 5000)).toBe(false);
  expect(operationPollInterval(true, true, 2000)).toBe(15000);
  expect(operationPollInterval(true, false, 2000)).toBe(2000);
  expect(operationPollInterval(true, false, 5000)).toBe(5000);
});
