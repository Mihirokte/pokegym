// Google Identity Services (GIS) token client.
//
// This is Google's modern replacement for the old OAuth 2.0 implicit-grant
// redirect flow (response_type=token) which they deprecated for new clients
// in 2024. Key differences:
//   • No redirect_uri anymore — a popup returns the token in-process.
//   • `google.accounts.oauth2.initTokenClient(...)` creates a reusable
//     handle; calling `.requestAccessToken()` triggers consent / silent
//     refresh depending on whether `prompt: ''` is passed.
//   • User profile is fetched separately from the `userinfo` endpoint,
//     same as before.
//
// Docs: https://developers.google.com/identity/oauth2/web/guides/use-token-model
//
// Everything outside this file — sync, sheets, session — sees the same
// getAuth() shape it did under the old flow, so the migration is contained.

import { APP, SCOPES, SCOPES_VERSION } from './config.js';
import { lsGet, lsSet, lsRemove, getClientId } from './storage.js';

const LS = APP.lsKey.auth;
const LS_SCOPES_V = APP.lsKey.scopesV;
const GIS_SRC = 'https://accounts.google.com/gsi/client';

// ── In-memory state ───────────────────────────────────────────────────────
const state = {
  user: null,
  accessToken: null,
  tokenExpiresAt: 0,
  spreadsheetId: null,
  sheetGids: {},
  lastRefreshAt: 0,
  refreshTimer: null,
  tokenClient: null, // GIS token client handle
};

// ── Pub/sub ───────────────────────────────────────────────────────────────
const listeners = new Set();
export function onAuthChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { for (const fn of listeners) try { fn(getAuth()); } catch (e) { console.error(e); } }

// ── Persistence ──────────────────────────────────────────────────────────
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
    const stale = lsGet(LS, {}) || {};
    lsRemove(LS);
    if (stale.spreadsheetId) {
      lsSet(LS, { spreadsheetId: stale.spreadsheetId, sheetGids: stale.sheetGids || {} });
    }
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

// ── GIS script loader ────────────────────────────────────────────────────
let gisPromise = null;
function loadGIS() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google);
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true; s.defer = true;
    s.onload = () => {
      if (window.google?.accounts?.oauth2) resolve(window.google);
      else reject(new Error('GIS loaded but oauth2 missing'));
    };
    s.onerror = () => reject(new Error('GIS script failed to load'));
    document.head.appendChild(s);
  });
  return gisPromise;
}

// Kick off GIS preload as soon as this module is imported. No-op in SSR.
if (typeof window !== 'undefined') loadGIS().catch(() => {});

// ── Token client (lazy) ──────────────────────────────────────────────────
async function ensureTokenClient() {
  if (state.tokenClient) return state.tokenClient;
  const clientId = getClientId();
  if (!clientId) throw new Error('Google Client ID not configured');
  const google = await loadGIS();
  state.tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    // Callback is set per-request so each caller gets its own Promise.
    callback: () => {},
  });
  return state.tokenClient;
}

// ── Public API ───────────────────────────────────────────────────────────

export function getAuth() {
  return {
    user: state.user,
    accessToken: state.accessToken,
    tokenExpiresAt: state.tokenExpiresAt,
    spreadsheetId: state.spreadsheetId,
    sheetGids: state.sheetGids,
    isSignedIn: !!state.accessToken && Date.now() < state.tokenExpiresAt,
    hasClientId: !!getClientId(),
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

/**
 * Request an access token via GIS popup. Returns a Promise that resolves
 * once the user consents and we've fetched their profile. The first call
 * in a session shows the consent UI; subsequent calls with `prompt: ''`
 * are silent refreshes.
 */
export async function signIn({ silent = false } = {}) {
  const tc = await ensureTokenClient();
  return new Promise((resolve, reject) => {
    tc.callback = async (resp) => {
      if (resp.error) return reject(new Error(resp.error_description || resp.error));
      try {
        const tokenExpiresAt = Date.now() + (resp.expires_in || 3600) * 1000;
        state.accessToken = resp.access_token;
        state.tokenExpiresAt = tokenExpiresAt;
        state.lastRefreshAt = Date.now();

        // Fetch userinfo (only on first sign-in or when we don't have it yet)
        if (!state.user) {
          try {
            const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${resp.access_token}` },
            });
            if (r.ok) {
              const p = await r.json();
              state.user = { email: p.email, name: p.name, picture: p.picture, given_name: p.given_name };
            }
          } catch (e) { /* userinfo is non-critical */ }
        }

        save();
        scheduleRefresh();
        emit();
        resolve(resp.access_token);
      } catch (e) { reject(e); }
    };
    tc.requestAccessToken(silent ? { prompt: '' } : { prompt: 'consent' });
  });
}

export function signOut() {
  const preserved = { spreadsheetId: state.spreadsheetId, sheetGids: state.sheetGids };
  if (state.refreshTimer) clearTimeout(state.refreshTimer);
  // Best-effort revoke so the browser's Google session is cleaned too.
  if (state.accessToken && window.google?.accounts?.oauth2?.revoke) {
    try { window.google.accounts.oauth2.revoke(state.accessToken, () => {}); } catch {}
  }
  lsRemove(LS);
  lsSet(LS, preserved);
  Object.assign(state, {
    user: null, accessToken: null, tokenExpiresAt: 0,
    lastRefreshAt: 0, refreshTimer: null,
  });
  emit();
}

/**
 * Silent token refresh. Uses `prompt: ''` which tells GIS to refresh without
 * UI as long as the user's Google session is still alive. Returns true on
 * success, false if Google requires interactive consent again.
 */
export async function refreshSilently() {
  try {
    await signIn({ silent: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Back-compat: the old implicit flow parsed `#access_token=...` on return
 * from Google. GIS doesn't use a redirect so this is a no-op kept only to
 * avoid changing `app.js`. Always returns false.
 */
export async function handleRedirect() { return false; }

function scheduleRefresh() {
  if (state.refreshTimer) clearTimeout(state.refreshTimer);
  if (!state.tokenExpiresAt) return;
  const ms = Math.max(0, state.tokenExpiresAt - Date.now() - 5 * 60 * 1000);
  state.refreshTimer = setTimeout(() => { refreshSilently(); }, ms);
}

if (isSignedIn()) scheduleRefresh();
