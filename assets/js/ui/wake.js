// Keep the screen awake during a workout. Uses Screen Wake Lock API where
// available; gracefully no-ops on unsupported browsers.

let sentinel = null;

export async function acquire() {
  try {
    if (!('wakeLock' in navigator)) return false;
    sentinel = await navigator.wakeLock.request('screen');
    // Re-acquire on visibility change (iOS releases on tab blur).
    document.addEventListener('visibilitychange', reacquireIfLost);
    sentinel.addEventListener?.('release', () => { sentinel = null; });
    return true;
  } catch (e) {
    console.warn('[wake] acquire failed:', e);
    sentinel = null;
    return false;
  }
}

export async function release() {
  document.removeEventListener('visibilitychange', reacquireIfLost);
  try { await sentinel?.release(); } catch {}
  sentinel = null;
}

async function reacquireIfLost() {
  if (document.visibilityState === 'visible' && !sentinel) {
    await acquire();
  }
}

export function isActive() { return !!sentinel; }
