// Offline-first sync layer.
//
// Writes go into a queue (localStorage) tagged with an idempotency key
// (the row's `id`). When online + signed in, the queue is flushed in order
// with exponential backoff on failure.
//
// Reads always come from the local mirror. `pullAll` refreshes the mirror
// from the Sheet — called at login and on manual refresh.

import { Sheets } from './sheets.js';
import { SHEET_NAMES } from './config.js';
import { APP } from './config.js';
import {
  lsGet, lsSet,
  readMirror, writeMirror, upsertMirrorRow, replaceMirrorSheet, mirrorSheet,
} from './storage.js';
import { getAuth, onAuthChange } from './auth.js';
import { nowISO, uid, sleep } from './util.js';
import { toast } from './ui/toast.js';
import { initialTeamState } from './data/pokemon.js';

const QKEY = APP.lsKey.queue;

// ── Queue primitives ──────────────────────────────────────────────────────
function readQ() { return lsGet(QKEY, []) || []; }
function writeQ(q) { lsSet(QKEY, q); notify(); }

const listeners = new Set();
export function onSyncChange(fn) { listeners.add(fn); fn(status()); return () => listeners.delete(fn); }
function notify() { const s = status(); for (const fn of listeners) try { fn(s); } catch {} }

let flushing = false;
let online = typeof navigator === 'undefined' ? true : navigator.onLine;

export function status() {
  return {
    online,
    flushing,
    queued: readQ().length,
    lastSync: lsGet(APP.lsKey.lastSync, null),
    linked: !!getAuth().spreadsheetId,
    signedIn: getAuth().isSignedIn,
  };
}

// ── Public writes — always optimistic ─────────────────────────────────────
/**
 * Append a new row. Local mirror updated immediately; queued for Sheets sync.
 */
export function appendRow(sheetName, row) {
  if (!row.id) row.id = uid();
  if (!row.createdAt) row.createdAt = nowISO();
  upsertMirrorRow(sheetName, row);
  enqueue({ op: 'append', sheet: sheetName, row });
  scheduleFlush();
  return row;
}

/**
 * Upsert (update by id, append if missing).
 */
export function upsertRow(sheetName, row) {
  if (!row.id) row.id = uid();
  row.updatedAt = nowISO();
  upsertMirrorRow(sheetName, row);
  enqueue({ op: 'upsert', sheet: sheetName, row });
  scheduleFlush();
  return row;
}

/**
 * Remove by id.
 */
export function removeRow(sheetName, id) {
  const mirror = readMirror();
  mirror[sheetName] = (mirror[sheetName] || []).filter(r => r.id !== id);
  writeMirror(mirror);
  enqueue({ op: 'remove', sheet: sheetName, id });
  scheduleFlush();
}

function enqueue(item) {
  const q = readQ();
  // Collapse consecutive upserts on the same id into the latest one so we
  // don't replay every keystroke when the user edits a set.
  if (item.op === 'upsert') {
    const idx = q.findIndex(x => x.op === 'upsert' && x.sheet === item.sheet && x.row.id === item.row.id);
    if (idx >= 0) {
      q[idx] = { ...item, queuedAt: q[idx].queuedAt };
      writeQ(q);
      return;
    }
  }
  q.push({ ...item, queuedAt: Date.now(), key: uid('q') });
  writeQ(q);
}

// ── Flush ─────────────────────────────────────────────────────────────────
let flushTimer = null;
export function scheduleFlush(delay = 300) {
  if (flushTimer) return;
  flushTimer = setTimeout(() => { flushTimer = null; flush(); }, delay);
}

export async function flush() {
  if (flushing) return;
  if (!online) return;
  const { isSignedIn, spreadsheetId, isDemo } = getAuth();
  if (isDemo) return; // Demo mode — never touch the network
  if (!isSignedIn || !spreadsheetId) return;

  flushing = true; notify();
  let failures = 0;

  try {
    while (true) {
      const q = readQ();
      if (q.length === 0) break;
      const item = q[0];
      try {
        if (item.op === 'append') {
          await Sheets.append(item.sheet, item.row);
        } else if (item.op === 'upsert') {
          await Sheets.upsert(item.sheet, item.row);
        } else if (item.op === 'remove') {
          await Sheets.remove(item.sheet, item.id);
        }
        // success — pop head
        const q2 = readQ();
        q2.shift();
        writeQ(q2);
        failures = 0;
      } catch (e) {
        failures++;
        console.warn('[sync] flush error:', e);
        if (failures >= 3) {
          toast(`Sync paused — ${readQ().length} change(s) will retry later`, 'warn');
          break;
        }
        await sleep(1500 * failures);
      }
    }
    lsSet(APP.lsKey.lastSync, nowISO());
  } finally {
    flushing = false; notify();
  }
}

// ── Pull from Sheet → mirror ──────────────────────────────────────────────
export async function pullAll() {
  const { isSignedIn, spreadsheetId, isDemo } = getAuth();
  if (isDemo) { notify(); return; }
  if (!isSignedIn || !spreadsheetId) return;
  for (const name of SHEET_NAMES) {
    try {
      const rows = await Sheets.readAll(name);
      replaceMirrorSheet(name, rows);
    } catch (e) {
      console.warn(`[sync] pull ${name} failed:`, e);
    }
  }
  lsSet(APP.lsKey.lastSync, nowISO());
  notify();
}

// ── Bootstrap for a new user ─────────────────────────────────────────────
/**
 * First-login boot: ensure spreadsheet exists, pull data, seed TeamState
 * if empty.
 */
export async function bootstrap() {
  const { isDemo } = getAuth();
  if (isDemo) return; // Demo already has a seeded mirror.
  await Sheets.ensureSpreadsheet();
  await pullAll();
  const team = mirrorSheet('TeamState');
  if (team.length === 0) {
    const seed = initialTeamState();
    for (const row of seed) upsertRow('TeamState', { ...row, id: row.dayKey });
    await flush();
  }
}

// ── Network listeners ─────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('online',  () => { online = true; notify(); scheduleFlush(); });
  window.addEventListener('offline', () => { online = false; notify(); });
}

// Auto-flush when auth changes (login/refresh).
onAuthChange(() => scheduleFlush(800));

// Kick a flush on startup in case we restored a signed-in session.
if (typeof window !== 'undefined') setTimeout(scheduleFlush, 1500);
