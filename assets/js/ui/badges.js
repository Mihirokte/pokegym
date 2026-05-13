// Gym-leader badges. Earn one per 6-workout week. Ordered progression: Kanto
// 8 → Elite Four 4 → Champion (repeats).

import { el, spritePath, mondayOfWeekISO, nowISO, uid, todayISO } from '../util.js';
import { LEADERS, ELITE_FOUR, CHAMPION, ALL_BADGES, WORKOUTS_PER_BADGE } from '../data/leaders.js';
import { mirrorSheet } from '../storage.js';
import { appendRow } from '../sync.js';
import { toast } from './toast.js';

export function renderBadges(root) {
  root.innerHTML = '';
  const badges = mirrorSheet('Badges');
  const earnedIndices = new Set(badges.map(b => Number(b.badgeIndex)));

  // Progress toward next badge
  const sessions = mirrorSheet('Sessions');
  const weekStart = mondayOfWeekISO();
  const thisWeek = sessions.filter(s => s.dateISO >= weekStart).length;
  const nextIndex = ALL_BADGES.findIndex(b => !earnedIndices.has(b.index));
  const nextBadge = nextIndex >= 0 ? ALL_BADGES[nextIndex] : CHAMPION;
  const toNext = Math.max(0, WORKOUTS_PER_BADGE - thisWeek);

  root.appendChild(el('div', { class: 'page-head' },
    el('h2', {}, 'Badges'),
    el('p', { class: 'sub' }, `${earnedIndices.size} / ${ALL_BADGES.length} earned · ${thisWeek} workouts this week · ${toNext} to ${nextBadge.badge}`),
  ));

  // Kanto Gym Leaders
  root.appendChild(el('h3', { class: 'section-h3' }, 'Kanto Gym Leaders'));
  root.appendChild(gridFor(LEADERS, earnedIndices));

  // Elite Four
  root.appendChild(el('h3', { class: 'section-h3' }, 'Elite Four'));
  root.appendChild(gridFor(ELITE_FOUR, earnedIndices));

  // Champion
  root.appendChild(el('h3', { class: 'section-h3' }, 'Champion'));
  root.appendChild(gridFor([CHAMPION], earnedIndices));
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

/**
 * Called after a finished session — awards badges for every completed full
 * week since the last recorded badge.
 */
export function evaluateBadges() {
  const sessions = mirrorSheet('Sessions');
  if (sessions.length === 0) return;

  const earned = mirrorSheet('Badges');
  const earnedIndices = new Set(earned.map(b => Number(b.badgeIndex)));

  // Group sessions by week (ISO Monday)
  const byWeek = {};
  for (const s of sessions) {
    if (!s.dateISO) continue;
    const wk = mondayOfWeekISO(new Date(s.dateISO));
    byWeek[wk] = (byWeek[wk] || 0) + 1;
  }
  // Weeks that hit the threshold, sorted oldest-first
  const earnWeeks = Object.entries(byWeek)
    .filter(([, n]) => n >= WORKOUTS_PER_BADGE)
    .map(([wk]) => wk)
    .sort();

  // For each qualifying week, assign the next unearned badge
  for (const wk of earnWeeks) {
    if (earned.some(b => b.weekStartISO === wk)) continue;
    const nextIdx = ALL_BADGES.findIndex(b => !earnedIndices.has(b.index));
    if (nextIdx < 0) break; // all earned
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
    earned.push(row); // local
    appendRow('Badges', row);
    toast(`Badge earned: ${def.badge} (${def.name})`, 'ok', { ms: 4500 });
  }
}
