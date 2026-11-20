// Keep a bounded fallback even when realtime is connected: events can be missed.
export function operationPollInterval(running: boolean, connected: boolean, disconnectedMs: number): number | false {
  return running ? (connected ? 15000 : disconnectedMs) : false;
}
