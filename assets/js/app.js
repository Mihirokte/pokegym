// PokeGym orchestrator. Owns the root DOM shell and swaps in page renderers
// based on the current route. No framework — a tiny hash-router is plenty.

import { el, qs, haptic } from './util.js';
import { getAuth, handleRedirect, signIn, signOut, onAuthChange } from './auth.js';
import { bootstrap, pullAll, onSyncChange, status as syncStatus, flush } from './sync.js';
import { getClientId } from './storage.js';
import { isDemo, exitDemo } from './demo.js';

import { renderSetup } from './ui/setup.js';
import { renderSessions } from './ui/session.js';
import { renderBadges, evaluateBadges } from './ui/badges.js';
import { renderLibrary } from './ui/library.js';
import { mountTimer } from './ui/timer.js';
import { toast } from './ui/toast.js';
import * as Wake from './ui/wake.js';

// ── Routing ───────────────────────────────────────────────────────────────
const ROUTES = {
  '':         { label: 'Today',    render: renderSessions, icon: '🏋' },
  session:    { label: 'Today',    render: renderSessions, icon: '🏋' },
  badges:     { label: 'Badges',   render: renderBadges,   icon: '🏅' },
  library:    { label: 'Library',  render: renderLibrary,  icon: '📚' },
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
      el('span', { class: 'demo-pill', id: 'demo-pill' }, 'DEMO'),
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
    nav.appendChild(el('a', {
      href: `#${key}`,
      class: 'navitem',
      'data-route': key,
    },
      el('span', { class: 'nav-ico' }, r.icon),
      el('span', { class: 'nav-label' }, r.label),
    ));
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
  qs('#demo-pill')?.classList.toggle('visible', !!auth.isDemo);
  document.querySelectorAll('.navitem').forEach(a => {
    a.classList.toggle('active', a.dataset.route === key);
  });
}

async function onSignOut() {
  const auth = getAuth();
  if (auth.isDemo) {
    if (!confirm('Exit demo? Sample data will be cleared.')) return;
    exitDemo();
    location.hash = '';
    location.reload();
    return;
  }
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
