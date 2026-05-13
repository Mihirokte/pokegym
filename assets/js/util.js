// Small helpers used everywhere.

// ── IDs ────────────────────────────────────────────────────────────────────
// Prefer crypto.randomUUID when available, fall back to a collision-resistant
// timestamp+random id that still sorts roughly chronologically.
export function uid(prefix = '') {
  const u = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : (Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
  return prefix ? `${prefix}_${u}` : u;
}

// ── Date ───────────────────────────────────────────────────────────────────
export function nowISO() {
  return new Date().toISOString();
}

export function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Day-of-week index where 0=Mon, 6=Sun. JS getDay() is 0=Sun ... 6=Sat.
export function dayIndexFromDate(date = new Date()) {
  return (date.getDay() + 6) % 7;
}

// Monday of the week containing the given date. Returns YYYY-MM-DD.
export function mondayOfWeekISO(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

export function formatDuration(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── DOM ────────────────────────────────────────────────────────────────────
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k in node) {
      try { node[k] = v; } catch { node.setAttribute(k, v); }
    } else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return node;
}

export function mount(target, ...children) {
  if (typeof target === 'string') target = document.querySelector(target);
  target.innerHTML = '';
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    target.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return target;
}

export function qs(sel, root = document) { return root.querySelector(sel); }
export function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

// ── Haptic ─────────────────────────────────────────────────────────────────
export function haptic(pattern = 10) {
  try { navigator.vibrate?.(pattern); } catch {}
}

// ── Retry ──────────────────────────────────────────────────────────────────
export async function retry(fn, { retries = 4, baseMs = 500, maxMs = 8000, isRetryable } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try { return await fn(i); }
    catch (e) {
      lastErr = e;
      if (i === retries) break;
      const retryable = isRetryable ? isRetryable(e) : true;
      if (!retryable) break;
      const delay = Math.min(maxMs, baseMs * Math.pow(2, i)) * (0.7 + Math.random() * 0.6);
      await sleep(delay);
    }
  }
  throw lastErr;
}

export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Sprites ────────────────────────────────────────────────────────────────
// Sprites live under assets/sprites/pokemon/{name}.png. The pokesprite naming
// is lowercase kebab-case (e.g. 'mr-mime', 'nidoran-f', 'type-null').
export function spritePath(slug, { shiny = false } = {}) {
  const base = 'assets/sprites/pokemon';
  return shiny ? `${base}/shiny/${slug}.png` : `${base}/${slug}.png`;
}

export function ballPath(kind = 'poke') {
  return `assets/sprites/items/${kind}.png`;
}

// ── Random ─────────────────────────────────────────────────────────────────
export function randInt(min, maxInclusive) {
  return Math.floor(Math.random() * (maxInclusive - min + 1)) + min;
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function weightedPick(items, weightFn = i => i.weight ?? 1) {
  const total = items.reduce((s, i) => s + weightFn(i), 0);
  let r = Math.random() * total;
  for (const i of items) {
    r -= weightFn(i);
    if (r <= 0) return i;
  }
  return items[items.length - 1];
}

// 1/256 classic shiny odds; tweakable if we decide streaks should boost it.
export function rollShiny(oddsDenominator = 256) {
  return Math.random() < (1 / oddsDenominator);
}

// ── Debounce ───────────────────────────────────────────────────────────────
export function debounce(fn, wait = 300) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

// ── JSON-safe clone ────────────────────────────────────────────────────────
export function clone(obj) {
  if (typeof structuredClone === 'function') return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

// ── Pct ────────────────────────────────────────────────────────────────────
export function pct(done, total) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}
