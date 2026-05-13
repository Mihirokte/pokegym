// PokeGym orchestrator. Owns the root DOM shell and swaps in page renderers
// based on the current route. No framework — a tiny hash-router is plenty.

import { el, qs, haptic } from './util.js';
import { getAuth, handleRedirect, signIn, signOut, onAuthChange } from './auth.js';
import { bootstrap, pullAll, onSyncChange, status as syncStatus, flush } from './sync.js';
import { getClientId } from './storage.js';

import { renderSetup } from './ui/setup.js';
import { renderSessions } from './ui/session.js';
import { renderBadges, evaluateBadges } from './ui/badges.js';
import { renderLibrary } from './ui/library.js';
import { mountTimer } from './ui/timer.js';
import { toast } from './ui/toast.js';
import * as Wake from './ui/wake.js';

// ── Routing ───────────────────────────────────────────────────────────────
const NAV_ICONS = {
  session: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5l11 11"/><path d="M21 21l-1.5-1.5"/><path d="M3 3l1.5 1.5"/><rect x="6.5" y="3" width="3.5" height="7" rx="0.5" transform="rotate(-45 8.25 6.5)"/><rect x="14" y="14" width="3.5" height="7" rx="0.5" transform="rotate(-45 15.75 17.5)"/></svg>',
  badges:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"/><path d="M8.2 14 7 22l5-3 5 3-1.2-8"/></svg>',
  library: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/><path d="M9 6h7"/><path d="M9 10h5"/></svg>',
};

const ROUTES = {
  '':         { label: 'Today',    render: renderSessions, icon: NAV_ICONS.session },
  session:    { label: 'Today',    render: renderSessions, icon: NAV_ICONS.session },
  badges:     { label: 'Badges',   render: renderBadges,   icon: NAV_ICONS.badges  },
  library:    { label: 'Library',  render: renderLibrary,  icon: NAV_ICONS.library },
};

function currentRoute() {
  const hash = (location.hash || '#session').replace(/^#/, '').split('/')[0];
  return ROUTES[hash] ? hash : 'session';
}

// ── Shell ─────────────────────────────────────────────────────────────────
let shellReady = false;
function ensureShell() {
  if (shellReady) return;
  const root = qs('#app');
  root.innerHTML = '';

  // Top bar
  const top = el('div', { class: 'topbar' },
    el('div', { class: 'brand' },
      el('img', { src: 'assets/sprites/items/poke.png', alt: '' }),
      el('span', {}, 'PokéGym'),
    ),
    el('div', { class: 'top-right' },
      el('span', { class: 'sync-dot', id: 'sync-dot', title: 'Sync status' }),
      el('button', { class: 'icon-btn', id: 'refresh-btn', type: 'button', title: 'Refresh', onClick: manualRefresh }, '↻'),
      el('button', { class: 'icon-btn', id: 'signout-btn', type: 'button', title: 'Sign out', onClick: onSignOut }, '⎋'),
    ),
  );

  const main = el('main', { class: 'main', id: 'main' });
  const nav = el('nav', { class: 'bottomnav' });
  for (const [key, r] of Object.entries(ROUTES)) {
    if (key === '') continue;
    const item = el('a', {
      href: `#${key}`,
      class: 'navitem',
      'data-route': key,
    },
      el('span', { class: 'nav-ico' }),
      el('span', { class: 'nav-label' }, r.label),
    );
    item.querySelector('.nav-ico').innerHTML = r.icon;
    nav.appendChild(item);
  }

  root.append(top, main, nav);
  mountTimer(main);
  shellReady = true;
}

function render() {
  ensureShell();
  const key = currentRoute();
  const main = qs('#main');
  const page = el('div', { class: 'page active', id: `page-${key}` });
  main.querySelectorAll('.page').forEach(p => p.remove());
  main.appendChild(page);

  const auth = getAuth();
  if (!auth.hasClientId || !auth.isSignedIn) {
    renderSetup(page);
  } else {
    try { ROUTES[key].render(page); }
    catch (e) { console.error('[app] render failed:', e); page.innerHTML = `<pre class="err">${e?.message || e}</pre>`; }
  }

  updateNav();
}

function updateNav() {
  const auth = getAuth();
  const key = currentRoute();
  qs('.bottomnav')?.classList.toggle('hidden', !(auth.hasClientId && auth.isSignedIn));
  qs('.topbar')?.classList.toggle('hidden', !(auth.hasClientId && auth.isSignedIn));
  document.querySelectorAll('.navitem').forEach(a => {
    a.classList.toggle('active', a.dataset.route === key);
  });
}

async function onSignOut() {
  if (!confirm('Sign out? Your data stays in Google Sheets.')) return;
  signOut();
  render();
}

async function manualRefresh() {
  const btn = qs('#refresh-btn');
  btn?.classList.add('spin');
  try {
    await pullAll();
    evaluateBadges();
    toast('Synced', 'ok');
    render();
  } catch (e) {
    toast('Sync failed — will retry', 'warn');
    console.error(e);
  } finally {
    setTimeout(() => btn?.classList.remove('spin'), 400);
  }
}

function bindSyncIndicator() {
  const dot = qs('#sync-dot');
  if (!dot) return;
  const update = (s) => {
    dot.classList.remove('online', 'offline', 'syncing', 'queued');
    if (!s.online) dot.classList.add('offline');
    else if (s.flushing) dot.classList.add('syncing');
    else if (s.queued > 0) dot.classList.add('queued');
    else dot.classList.add('online');
    dot.title = s.online ? (s.flushing ? 'Syncing…' : s.queued > 0 ? `${s.queued} queued` : 'Online · synced') : 'Offline';
  };
  onSyncChange(update);
  update(syncStatus());
}

// ── Boot ──────────────────────────────────────────────────────────────────
async function boot() {
  // Mobile 100vh fix
  const setVh = () => document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
  setVh();
  window.addEventListener('resize', setVh);
  window.addEventListener('orientationchange', setVh);

  // Parse OAuth redirect if we just came back from Google
  const redirected = await handleRedirect();

  // Render first
  render();
  bindSyncIndicator();

  // React to auth changes
  onAuthChange(() => { render(); });
  window.addEventListener('hashchange', render);

  // If signed in and we have a client ID, bootstrap (ensure spreadsheet, pull).
  if (getAuth().hasClientId && getAuth().isSignedIn) {
    try {
      await bootstrap();
      evaluateBadges();
      render();
      if (redirected) toast('Signed in — spreadsheet linked', 'ok');
    } catch (e) {
      console.error('[app] bootstrap failed:', e);
      toast('Couldn\'t reach Google Sheets — working offline', 'warn');
    }
  }

  // Periodic background sync flush
  setInterval(flush, 60_000);

  // Service worker — register once we're past first paint
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('[sw] register failed:', err));
  }
}

boot();
