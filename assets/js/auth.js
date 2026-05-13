// Google OAuth 2.0 implicit flow. Pattern adapted from pokecity's authStore,
// translated to vanilla module-scope state + simple events.

import { APP, SCOPES, SCOPES_VERSION } from './config.js';
import { lsGet, lsSet, lsRemove, getClientId } from './storage.js';

const LS = APP.lsKey.auth;
const LS_SCOPES_V = APP.lsKey.scopesV;

// In-memory state — mirrored to localStorage.
const state = {
  user: null,
  accessToken: null,
  tokenExpiresAt: 0,
  spreadsheetId: null,
  sheetGids: {},
  lastRefreshAt: 0,
  refreshTimer: null,
};

// ── Pub/sub ────────────────────────────────────────────────────────────────
const listeners = new Set();
export function onAuthChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { for (const fn of listeners) try { fn(getAuth()); } catch (e) { console.error(e); } }

// ── Persistence ───────────────────────────────────────────────────────────
function save() {
  lsSet(LS, {
    user: state.user,
    accessToken: state.accessToken,
    tokenExpiresAt: state.tokenExpiresAt,
    spreadsheetId: state.spreadsheetId,
    sheetGids: state.sheetGids,
    lastRefreshAt: state.lastRefreshAt,
  });
  lsSet(LS_SCOPES_V, SCOPES_VERSION);
}

function load() {
  const storedV = lsGet(LS_SCOPES_V, 0);
  if (storedV < SCOPES_VERSION) {
    // Scopes changed — drop the token so the user re-consents. Keep spreadsheetId.
    const stale = lsGet(LS, {}) || {};
    lsRemove(LS);
    if (stale.spreadsheetId) lsSet(LS, { spreadsheetId: stale.spreadsheetId, sheetGids: stale.sheetGids || {} });
  }
  const s = lsGet(LS, {}) || {};
  Object.assign(state, {
    user: s.user || null,
    accessToken: s.accessToken || null,
    tokenExpiresAt: s.tokenExpiresAt || 0,
    spreadsheetId: s.spreadsheetId || null,
    sheetGids: s.sheetGids || {},
    lastRefreshAt: s.lastRefreshAt || 0,
  });
}

load();

// ── Public API ────────────────────────────────────────────────────────────

export function getAuth() {
  // Demo mode short-circuits: pretend we're fully signed in with a local profile.
  // Kept inline rather than importing demo.js to avoid a circular dep.
  const demoOn = (() => { try { return JSON.parse(localStorage.getItem('pokegym.demo') || 'false') === true; } catch { return false; } })();
  if (demoOn) {
    return {
      user: { email: 'demo@pokegym', name: 'Demo Trainer', picture: '', given_name: 'Demo' },
      accessToken: 'demo',
      tokenExpiresAt: Date.now() + 3600_000,
      spreadsheetId: 'demo',
      sheetGids: {},
      isSignedIn: true,
      hasClientId: true,
      isDemo: true,
    };
  }
  return {
    user: state.user,
    accessToken: state.accessToken,
    tokenExpiresAt: state.tokenExpiresAt,
    spreadsheetId: state.spreadsheetId,
    sheetGids: state.sheetGids,
    isSignedIn: !!state.accessToken && Date.now() < state.tokenExpiresAt,
    hasClientId: !!getClientId(),
    isDemo: false,
  };
}

export function isSignedIn() { return getAuth().isSignedIn; }

export function setSpreadsheet(id, gids = {}) {
  state.spreadsheetId = id || null;
  state.sheetGids = gids || {};
  save(); emit();
}

export function getToken() {
  if (!state.accessToken || Date.now() >= state.tokenExpiresAt) return null;
  return state.accessToken;
}

function redirectUri() {
  // GitHub Pages base path lives in <base> element OR the path part of location.
  // We compute a value the Google console can accept verbatim.
  return window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
}

export function signIn() {
  const clientId = getClientId();
  if (!clientId) throw new Error('Google Client ID not configured');

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri());
  url.searchParams.set('response_type', 'token');
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('prompt', 'select_account');
  // Lightweight CSRF defense — we won't strictly verify but the hash is
  // parsed in-document so XSS is the real attack surface.
  const nonce = Math.random().toString(36).slice(2);
  url.searchParams.set('state', nonce);
  sessionStorage.setItem('pokegym.oauthNonce', nonce);
  window.location.href = url.toString();
}

export function signOut() {
  // Preserve spreadsheetId so sync picks up where it left off on next login.
  const preserved = { spreadsheetId: state.spreadsheetId, sheetGids: state.sheetGids };
  if (state.refreshTimer) clearTimeout(state.refreshTimer);
  lsRemove(LS);
  lsSet(LS, preserved);
  Object.assign(state, {
    user: null, accessToken: null, tokenExpiresAt: 0,
    lastRefreshAt: 0, refreshTimer: null,
  });
  emit();
}

/**
 * Parse `#access_token=...` fragment after OAuth redirect. Returns true if a
 * token was extracted. Safe to call on every load.
 */
export async function handleRedirect() {
  const hash = window.location.hash || '';
  if (!hash.includes('access_token')) return false;

  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const accessToken = params.get('access_token');
  const expiresIn = parseInt(params.get('expires_in') || '3600', 10);
  const returnedState = params.get('state');

  const nonce = sessionStorage.getItem('pokegym.oauthNonce');
  sessionStorage.removeItem('pokegym.oauthNonce');
  if (!accessToken || (nonce && returnedState !== nonce)) {
    // Strip hash regardless so we don't loop.
    history.replaceState(null, '', window.location.pathname + window.location.search);
    return false;
  }

  // Strip hash before any fetches happen.
  history.replaceState(null, '', window.location.pathname + window.location.search);

  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`userinfo ${res.status}`);
    const profile = await res.json();
    state.user = {
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
      given_name: profile.given_name,
    };
  } catch (e) {
    console.warn('[auth] userinfo failed:', e);
    state.user = state.user || { email: 'you@gym', name: 'Trainer' };
  }

  state.accessToken = accessToken;
  state.tokenExpiresAt = Date.now() + expiresIn * 1000;
  state.lastRefreshAt = Date.now();
  save();
  scheduleRefresh();
  emit();
  return true;
}

/**
 * Silent token refresh via hidden iframe (`prompt=none`). Returns true on
 * success, false otherwise. Google may refuse (e.g., after user revokes
 * consent) and we fall back to an interactive sign-in on next write.
 */
export async function refreshSilently() {
  const clientId = getClientId();
  if (!clientId) return false;

  return new Promise((resolve) => {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri());
    url.searchParams.set('response_type', 'token');
    url.searchParams.set('scope', SCOPES);
    url.searchParams.set('prompt', 'none');

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url.toString();

    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      try { iframe.remove(); } catch {}
      resolve(ok);
    };

    iframe.addEventListener('load', () => {
      try {
        const hash = iframe.contentWindow?.location?.hash || '';
        if (hash.includes('access_token')) {
          const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
          const token = params.get('access_token');
          const exp = parseInt(params.get('expires_in') || '3600', 10);
          if (token) {
            state.accessToken = token;
            state.tokenExpiresAt = Date.now() + exp * 1000;
            state.lastRefreshAt = Date.now();
            save();
            scheduleRefresh();
            emit();
            return finish(true);
          }
        }
      } catch {
        // cross-origin access will throw once Google redirects — ignore.
      }
      finish(false);
    });

    setTimeout(() => finish(false), 6000);
    document.body.appendChild(iframe);
  });
}

function scheduleRefresh() {
  if (state.refreshTimer) clearTimeout(state.refreshTimer);
  if (!state.tokenExpiresAt) return;
  // Refresh 5 min before expiry (or immediately if already under 5 min).
  const ms = Math.max(0, state.tokenExpiresAt - Date.now() - 5 * 60 * 1000);
  state.refreshTimer = setTimeout(() => { refreshSilently(); }, ms);
}

// Kick off a scheduled refresh if we restored a live token.
if (isSignedIn()) scheduleRefresh();
