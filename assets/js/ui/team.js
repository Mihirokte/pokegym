// Team view — all 7 day pokemon with levels, XP bars, and last-trained date.

import { el, spritePath } from '../util.js';
import { DAYS, dayByKey } from '../data/days.js';
import { TEAMS, teamForDay } from '../data/pokemon.js';
import { XP } from '../config.js';
import { mirrorSheet } from '../storage.js';

export function renderTeam(root) {
  const team = mirrorSheet('TeamState');
  root.innerHTML = '';

  root.appendChild(el('div', { class: 'page-head' },
    el('h2', {}, 'Your Team'),
    el('p', { class: 'sub' }, 'Each day of the week has its own Pokémon. Train consistently to evolve it.'),
  ));

  const grid = el('div', { class: 'team-grid' });
  for (const day of DAYS) {
    const teamDef = teamForDay(day.key);
    const row = team.find(t => t.dayKey === day.key) || {};
    const stage = Math.min(teamDef.line.length - 1, Number(row.stage || 0));
    const mon = teamDef.line[stage];
    const level = Number(row.level || 1);
    const xp = Number(row.xp || 0);
    const xpNeeded = XP.levelTable[Math.min(level, XP.levelTable.length - 1)];
    const xpPct = Math.min(100, Math.round((xp / xpNeeded) * 100));
    const shiny = row.isShiny === 'true';
    const lastWorkout = row.lastWorkoutISO;

    const card = el('div', { class: 'team-card', style: { '--c': day.color, '--a': day.accent } },
      el('div', { class: 'team-day' }, day.short),
      el('img', {
        class: 'team-sprite',
        src: spritePath(mon.slug, { shiny }),
        alt: mon.name,
        onerror: (e) => { e.target.src = spritePath('unknown'); },
      }),
      el('div', { class: 'team-name' }, shiny ? '★ ' : '', mon.name),
      el('div', { class: 'team-focus' }, day.focus),
      el('div', { class: 'team-level' }, `Lv. ${level}`),
      el('div', { class: 'xp-bar' }, el('div', { class: 'xp-fill', style: { width: `${xpPct}%` } })),
      el('div', { class: 'xp-text' }, `${xp} / ${xpNeeded} XP`),
      el('div', { class: 'team-last' }, lastWorkout ? `Last: ${lastWorkout}` : 'Not trained yet'),
      el('div', { class: 'team-blurb' }, teamDef.blurb),
      el('div', { class: 'team-stages' },
        ...teamDef.line.map((m, i) => el('img', {
          class: `stage-sprite ${i === stage ? 'active' : ''} ${i < stage ? 'past' : ''}`,
          src: spritePath(m.slug, { shiny: false }),
          alt: m.name,
          title: m.name,
          onerror: (e) => { e.target.src = spritePath('unknown'); },
        })),
      ),
    );
    grid.appendChild(card);
  }
  root.appendChild(grid);
}
