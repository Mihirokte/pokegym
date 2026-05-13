// Thin localStorage wrapper. Namespaced keys from config.APP.lsKey.
// Everything stored as JSON. Handles storage-quota failure gracefully.

import { APP, SHEET_NAMES } from './config.js';

export function lsGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('[storage] write failed:', e);
    return false;
  }
}

export function lsRemove(key) {
  try { localStorage.removeItem(key); } catch {}
}

// ── Sheet mirror ──────────────────────────────────────────────────────────
// A local copy of every sheet row so the app works offline instantly.
// Shape: { Sessions: [rowObj, ...], SetLog: [...], ... }

export function readMirror() {
  const raw = lsGet(APP.lsKey.mirror) || {};
  // Ensure every declared sheet has an array so callers can always `.map()`.
  const filled = {};
  for (const name of SHEET_NAMES) filled[name] = Array.isArray(raw[name]) ? raw[name] : [];
  return filled;
}

export function writeMirror(mirror) {
  lsSet(APP.lsKey.mirror, mirror);
}

export function mirrorSheet(sheetName) {
  return readMirror()[sheetName] || [];
}

export function upsertMirrorRow(sheetName, row, matchKey = 'id') {
  const mirror = readMirror();
  const list = mirror[sheetName] || (mirror[sheetName] = []);
  const i = list.findIndex(r => r[matchKey] === row[matchKey]);
  if (i >= 0) list[i] = { ...list[i], ...row };
  else list.push(row);
  writeMirror(mirror);
  return row;
}

export function deleteMirrorRow(sheetName, id) {
  const mirror = readMirror();
  mirror[sheetName] = (mirror[sheetName] || []).filter(r => r.id !== id);
  writeMirror(mirror);
}

export function replaceMirrorSheet(sheetName, rows) {
  const mirror = readMirror();
  mirror[sheetName] = rows;
  writeMirror(mirror);
}

// ── Settings ──────────────────────────────────────────────────────────────

export function getSettings() {
  return lsGet(APP.lsKey.settings) || {
    weightUnit: 'kg',
    soundOn: true,
    hapticOn: true,
    wakeLockOn: true,
    lastDayKey: null,
    shinyStreakBonus: true,
  };
}

export function saveSettings(patch) {
  const cur = getSettings();
  const next = { ...cur, ...patch };
  lsSet(APP.lsKey.settings, next);
  return next;
}

// ── Client ID (user-provided) ─────────────────────────────────────────────

export function getClientId() { return lsGet(APP.lsKey.clientId, ''); }
export function setClientId(id) { lsSet(APP.lsKey.clientId, String(id || '').trim()); }
