// A visit spans tabs for this account/browser until 30 minutes of inactivity.
// Storage holds an opaque identifier and timestamp only; unavailable storage leaves return unknown.
const idle = 30 * 60_000;
const key = (account: string) => 'coaching-visit:' + account;

export async function practiceVisit(account: string, create = true): Promise<string | null> {
  const touch = () => {
    const raw = localStorage.getItem(key(account));
    if (!raw && !create) return null;
    const last = raw && JSON.parse(raw);
    const now = Date.now();
    const renew = !last || typeof last.id !== 'string' || !(now - last.at >= 0 && now - last.at < idle);
    const id = renew ? crypto.randomUUID() : last.id;
    if (renew || now - last.at >= 1000) {
      localStorage.setItem(key(account), JSON.stringify({ id, at: now }));
    }
    if (!raw) window.dispatchEvent(new Event('coaching-visit-started'));
    if (renew && last) window.dispatchEvent(new Event('coaching-visit-changed'));
    return id;
  };
  try {
    return navigator.locks ? await navigator.locks.request(key(account), touch) : touch();
  } catch {
    return null;
  }
}

export function trackPracticeActivity(account: string) {
  let last = 0, tracking = false;
  const enable = () => {
    try {
      tracking = !!localStorage.getItem(key(account));
    } catch {
      tracking = false;
    }
  };
  enable();
  const sync = (event: StorageEvent) => {
    if (event.key === key(account) || event.key === null) enable();
  };
  window.addEventListener('storage', sync);
  window.addEventListener('coaching-visit-started', enable);
  const activity = () => {
    if (!tracking || document.visibilityState !== 'visible' || Date.now() - last < 1000) return;
    last = Date.now();
    void practiceVisit(account, false);
  };
  for (const event of ['pointerdown', 'keydown', 'scroll', 'focus']) {
    window.addEventListener(event, activity, { passive: true });
  }
  document.addEventListener('visibilitychange', activity);
  return () => {
    window.removeEventListener('storage', sync);
    window.removeEventListener('coaching-visit-started', enable);
    for (const event of ['pointerdown', 'keydown', 'scroll', 'focus']) {
      window.removeEventListener(event, activity);
    }
    document.removeEventListener('visibilitychange', activity);
  };
}
