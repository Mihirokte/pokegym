// Google Sheets API v4 service — the only module that talks to Google.
//
// Adapted from pokecity's sheetsService.ts, simplified to vanilla JS.
// Every public method goes through `withAuthRetry` which:
//   - refreshes the token silently on 401 (once)
//   - exponentially backs off on 429/5xx/network errors
//   - surfaces a clean Error to callers

import { APP, SHEET_HEADERS, SHEET_NAMES, TAB_NAMES, TAB_TO_SHEET, tabName } from './config.js';
import { getAuth, getToken, refreshSilently, setSpreadsheet } from './auth.js';
import { retry, sleep } from './util.js';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_API  = 'https://www.googleapis.com/drive/v3/files';

function headers() {
  const t = getToken();
  if (!t) throw new Error('401 Unauthorized');
  return {
    Authorization: `Bearer ${t}`,
    'Content-Type': 'application/json',
  };
}

async function fetchJSON(url, init = {}) {
  const res = await fetch(url, init);
  if (res.status === 204) return null;
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}: ${data?.error?.message || res.statusText}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

// Retry policy: 401 → refresh token once, 429/5xx/network → backoff, else fail.
async function withAuthRetry(fn) {
  let refreshed = false;
  return retry(async () => {
    try {
      return await fn();
    } catch (e) {
      if (e.status === 401 && !refreshed) {
        refreshed = true;
        const ok = await refreshSilently();
        if (ok) {
          // swap token and retry immediately — don't consume a backoff slot
          return fn();
        }
        throw e;
      }
      throw e;
    }
  }, {
    retries: 4,
    baseMs: 600,
    isRetryable: (e) => {
      if (!e || !e.status) return true; // network error
      return e.status === 429 || (e.status >= 500 && e.status < 600);
    },
  });
}

// ── Rows <-> Objects ──────────────────────────────────────────────────────
function rowToObject(sheetName, row) {
  const cols = SHEET_HEADERS[sheetName];
  const out = {};
  cols.forEach((c, i) => { out[c] = row[i] ?? ''; });
  return out;
}

function objectToRow(sheetName, obj) {
  const cols = SHEET_HEADERS[sheetName];
  return cols.map(c => {
    const v = obj[c];
    if (v == null) return '';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    return String(v);
  });
}

// ── Public service ────────────────────────────────────────────────────────

export const Sheets = {
  // Find an existing spreadsheet by name (in user's Drive) — or create one.
  async ensureSpreadsheet() {
    const { spreadsheetId } = getAuth();
    if (spreadsheetId) {
      // Validate it still exists and has our sheets
      try {
        const gids = await this.ensureAllSheets(spreadsheetId);
        setSpreadsheet(spreadsheetId, gids);
        return { spreadsheetId, gids, created: false };
      } catch (e) {
        if (e.status === 404) {
          // Linked sheet was deleted — fall through to create.
        } else {
          throw e;
        }
      }
    }

    return withAuthRetry(async () => {
      // Search Drive by name (scoped via drive.file — only sees files we created).
      const q = `name='${APP.spreadsheetName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
      const search = await fetchJSON(
        `${DRIVE_API}?q=${encodeURIComponent(q)}&fields=files(id,name)`,
        { headers: headers() },
      );
      let id = search?.files?.[0]?.id;

      if (!id) {
        // Create a brand-new spreadsheet with all our tabs pre-populated.
        const body = {
          properties: { title: APP.spreadsheetName },
          sheets: SHEET_NAMES.map(n => ({
            properties: { title: tabName(n) },
            data: [{
              startRow: 0, startColumn: 0,
              rowData: [{
                values: SHEET_HEADERS[n].map(h => ({ userEnteredValue: { stringValue: h } })),
              }],
            }],
          })),
        };
        const created = await fetchJSON(SHEETS_API, {
          method: 'POST', headers: headers(), body: JSON.stringify(body),
        });
        id = created.spreadsheetId;
        const gids = {};
        for (const s of created.sheets) {
          const internal = TAB_TO_SHEET[s.properties.title];
          if (internal) gids[internal] = s.properties.sheetId;
        }
        setSpreadsheet(id, gids);
        return { spreadsheetId: id, gids, created: true };
      }

      // Found it — make sure every tab exists.
      const gids = await this.ensureAllSheets(id);
      setSpreadsheet(id, gids);
      return { spreadsheetId: id, gids, created: false };
    });
  },

  // Ensure every SHEET_NAMES tab exists (with its header row). Returns gid map.
  async ensureAllSheets(spreadsheetId) {
    return withAuthRetry(async () => {
      const meta = await fetchJSON(
        `${SHEETS_API}/${spreadsheetId}?fields=sheets.properties`,
        { headers: headers() },
      );
      const existingByTitle = {};
      for (const s of meta.sheets || []) existingByTitle[s.properties.title] = s.properties.sheetId;

      const missing = SHEET_NAMES.filter(n => existingByTitle[tabName(n)] == null);
      const gids = {};
      for (const n of SHEET_NAMES) {
        const gid = existingByTitle[tabName(n)];
        if (gid != null) gids[n] = gid;
      }

      if (missing.length === 0) return gids;

      const addReqs = missing.map(n => ({
        addSheet: { properties: { title: tabName(n) } },
      }));
      const batch = await fetchJSON(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ requests: addReqs }),
      });
      for (const reply of batch.replies || []) {
        if (reply.addSheet) {
          const title = reply.addSheet.properties.title;
          const internal = TAB_TO_SHEET[title];
          if (internal) gids[internal] = reply.addSheet.properties.sheetId;
        }
      }

      // Write the header rows in bulk.
      const valueData = missing.map(n => ({
        range: `${tabName(n)}!A1`,
        values: [SHEET_HEADERS[n]],
      }));
      await fetchJSON(`${SHEETS_API}/${spreadsheetId}/values:batchUpdate`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ valueInputOption: 'RAW', data: valueData }),
      });

      return gids;
    });
  },

  // Full sheet read — returns typed objects (header-row skipped).
  async readAll(sheetName) {
    const { spreadsheetId } = getAuth();
    if (!spreadsheetId) throw new Error('No spreadsheet linked');
    return withAuthRetry(async () => {
      const tab = tabName(sheetName);
      const data = await fetchJSON(
        `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(tab)}`,
        { headers: headers() },
      );
      const rows = data?.values ?? [];
      return rows.slice(1).map(r => rowToObject(sheetName, r));
    });
  },

  // Append a typed object as a new row.
  async append(sheetName, obj) {
    const { spreadsheetId } = getAuth();
    if (!spreadsheetId) throw new Error('No spreadsheet linked');
    return withAuthRetry(async () => {
      const tab = tabName(sheetName);
      const row = objectToRow(sheetName, obj);
      await fetchJSON(
        `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(tab)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST', headers: headers(),
          body: JSON.stringify({ values: [row] }),
        },
      );
    });
  },

  // Update a row (matched by `lookupField`, default 'id'). Reads then writes.
  async update(sheetName, obj, lookupField = 'id') {
    const { spreadsheetId } = getAuth();
    if (!spreadsheetId) throw new Error('No spreadsheet linked');
    return withAuthRetry(async () => {
      const tab = tabName(sheetName);
      const all = await this.readAll(sheetName);
      const key = obj[lookupField];
      const idx = all.findIndex(r => r[lookupField] === key);
      if (idx === -1) {
        // Nothing to update — treat as append (idempotent-ish).
        return this.append(sheetName, obj);
      }
      const rowNum = idx + 2; // 1-indexed, row 1 is header
      const range = `${tab}!A${rowNum}`;
      const row = objectToRow(sheetName, obj);
      await fetchJSON(
        `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
        {
          method: 'PUT', headers: headers(),
          body: JSON.stringify({ values: [row] }),
        },
      );
    });
  },

  // Upsert: update if an id matches, append otherwise.
  async upsert(sheetName, obj, lookupField = 'id') {
    try {
      await this.update(sheetName, obj, lookupField);
    } catch (e) {
      if (e.status === 404) return this.append(sheetName, obj);
      throw e;
    }
  },

  // Delete a row by id (uses sheet gid).
  async remove(sheetName, id) {
    const { spreadsheetId, sheetGids } = getAuth();
    if (!spreadsheetId) throw new Error('No spreadsheet linked');
    const gid = sheetGids[sheetName];
    if (gid == null) throw new Error(`No gid for ${sheetName}`);
    return withAuthRetry(async () => {
      const all = await this.readAll(sheetName);
      const idx = all.findIndex(r => r.id === id);
      if (idx === -1) return;
      await fetchJSON(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({
          requests: [{
            deleteDimension: {
              range: {
                sheetId: gid,
                dimension: 'ROWS',
                startIndex: idx + 1, // +1 to skip header
                endIndex: idx + 2,
              },
            },
          }],
        }),
      });
    });
  },
};

export { SHEETS_API, DRIVE_API };
