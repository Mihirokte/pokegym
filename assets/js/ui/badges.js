// Badges page — progress ribbon, Kanto → Elite Four → Champion grids, plus
// a horizontal "recent catches" strip (this replaces the old Pokédex page).

import { el, spritePath, mondayOfWeekISO, nowISO, uid } from '../util.js';
import { LEADERS, ELITE_FOUR, CHAMPION, ALL_BADGES, WORKOUTS_PER_BADGE } from '../data/leaders.js';
import { mirrorSheet } from '../storage.js';
import { appendRow } from '../sync.js';
import { toast } from './toast.js';

export function renderBadges(root) {
  root.innerHTML = '';
  const badges = mirrorSheet('Badges');
  const earnedIndices = new Set(badges.map(b => Number(b.badgeIndex)));

  const sessions = mirrorSheet('Sessions');
  const weekStart = mondayOfWeekISO();
  const thisWeek = sessions.filter(s => s.dateISO >= weekStart).length;
  const nextIndex = ALL_BADGES.findIndex(b => !earnedIndices.has(b.index));
  const nextBadge = nextIndex >= 0 ? ALL_BADGES[nextIndex] : CHAMPION;
  const toNext = Math.max(0, WORKOUTS_PER_BADGE - thisWeek);
  const pct = Math.min(100, (thisWeek / WORKOUTS_PER_BADGE) * 100);

  root.appendChild(el('div', { class: 'page-head' },
    el('h2', {}, 'Badges'),
    el('p', { class: 'sub' },
      `${earnedIndices.size} / ${ALL_BADGES.length} earned · 6 sessions per week earns the next badge.`),
  ));

  // Progress ribbon — what's next
  root.appendChild(el('div', { class: 'badge-progress' },
    el('div', {},
      el('div', { class: 'badge-progress-label' },
        toNext > 0 ? `${toNext} to go for ${nextBadge.badge}` : `${nextBadge.badge} ready to claim`),
      el('div', { class: 'badge-progress-bar' },
        el('div', { class: 'badge-progress-fill', style: { width: `${pct}%` } }),
      ),
    ),
    el('div', { class: 'badge-progress-count' }, `${thisWeek}/${WORKOUTS_PER_BADGE}`),
  ));

  root.appendChild(el('h3', { class: 'section-h3' }, 'Kanto Gym Leaders'));
  root.appendChild(gridFor(LEADERS, earnedIndices));

  root.appendChild(el('h3', { class: 'section-h3' }, 'Elite Four'));
  root.appendChild(gridFor(ELITE_FOUR, earnedIndices));

  root.appendChild(el('h3', { class: 'section-h3' }, 'Champion'));
  root.appendChild(gridFor([CHAMPION], earnedIndices));

  // Recent catches strip — replaces the Pokédex route
  renderCatchesStrip(root);
}

function gridFor(list, earnedIndices) {
  const grid = el('div', { class: 'badge-grid' });
  for (const b of list) {
    const earned = earnedIndices.has(b.index);
    grid.appendChild(el('div', { class: `badge ${earned ? 'earned' : 'locked'}`, style: { '--c': b.color } },
      el('img', {
        class: 'badge-sprite',
        src: spritePath(b.signature),
        alt: b.signature,
        onerror: (e) => { e.target.src = spritePath('unknown'); },
      }),
      el('div', { class: 'badge-leader' }, b.name),
      el('div', { class: 'badge-name' }, b.badge),
      el('div', { class: 'badge-type' }, b.type.toUpperCase()),
    ));
  }
  return grid;
}

function renderCatchesStrip(root) {
  const catches = mirrorSheet('PokeballCatches');
  root.appendChild(el('h3', { class: 'section-h3' }, 'Recent Catches'));

  if (catches.length === 0) {
    root.appendChild(el('div', { class: 'empty' }, 'No catches yet. Tap the Pokéball during a workout.'));
    return;
  }

  // Aggregate by pokemonId for count + shiny flag
  const byMon = new Map();
  for (const c of [...catches].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const id = c.pokemonId || 'unknown';
    if (!byMon.has(id)) byMon.set(id, { id, total: 0, performed: 0, shiny: false, last: c.createdAt });
    const m = byMon.get(id);
    m.total++;
    if (c.didPerform === 'true') m.performed++;
    if (c.isShiny === 'true') m.shiny = true;
  }

  const strip = el('div', { class: 'catches-strip' });
  const list = [...byMon.values()].sort((a, b) => b.last.localeCompare(a.last)).slice(0, 20);
  for (const m of list) {
    strip.appendChild(el('div', { class: `catch-chip ${m.shiny ? 'shiny' : ''}` },
      el('img', {
        class: 'dex-mini',
        src: spritePath(m.id, { shiny: m.shiny }),
        alt: m.id,
        onerror: (e) => { e.target.src = spritePath('unknown'); },
      }),
      el('div', { class: 'catch-name' }, (m.shiny ? '★ ' : '') + m.id),
      el('div', { class: 'catch-meta' }, `×${m.total}`),
    ));
  }
  root.appendChild(strip);
}

/**
 * Called after a finished session — awards badges for every completed full
 * week since the last recorded badge.
 */
export function evaluateBadges() {
  const sessions = mirrorSheet('Sessions');
  if (sessions.length === 0) return;

  const earned = mirrorSheet('Badges');
  const earnedIndices = new Set(earned.map(b => Number(b.badgeIndex)));

  const byWeek = {};
  for (const s of sessions) {
    if (!s.dateISO) continue;
    const wk = mondayOfWeekISO(new Date(s.dateISO));
    byWeek[wk] = (byWeek[wk] || 0) + 1;
  }
  const earnWeeks = Object.entries(byWeek)
    .filter(([, n]) => n >= WORKOUTS_PER_BADGE)
    .map(([wk]) => wk)
    .sort();

  for (const wk of earnWeeks) {
    if (earned.some(b => b.weekStartISO === wk)) continue;
    const nextIdx = ALL_BADGES.findIndex(b => !earnedIndices.has(b.index));
    if (nextIdx < 0) break;
    const def = ALL_BADGES[nextIdx];
    const row = {
      id: uid('badge'),
      weekStartISO: wk,
      badgeIndex: def.index,
      badgeKey: def.key,
      leaderName: def.name,
      earnedAt: nowISO(),
      workoutsCompleted: String(byWeek[wk]),
      streak: String(earned.length + 1),
    };
    earnedIndices.add(def.index);
    earned.push(row);
    appendRow('Badges', row);
    toast(`Badge earned: ${def.badge} (${def.name})`, 'ok', { ms: 4500 });
  }
}
