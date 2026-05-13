// Pokedex — everything you've caught via Pokéball rolls. Shows unique
// species with count + shiny flag. Perform-rate (how often you actually did
// the exercise when it popped out) is a nice secondary stat.

import { el, spritePath } from '../util.js';
import { mirrorSheet } from '../storage.js';

export function renderPokedex(root) {
  root.innerHTML = '';
  const catches = mirrorSheet('PokeballCatches');

  root.appendChild(el('div', { class: 'page-head' },
    el('h2', {}, 'Pokédex'),
    el('p', { class: 'sub' }, `${new Set(catches.map(c => c.pokemonId)).size} unique encounters · ${catches.filter(c => c.didPerform === 'true').length} actually trained`),
  ));

  if (catches.length === 0) {
    root.appendChild(el('div', { class: 'empty' }, 'No encounters yet. Tap the Pokéball during a session.'));
    return;
  }

  // Aggregate by pokemonId
  const byMon = {};
  for (const c of catches) {
    const id = c.pokemonId || 'unknown';
    const cur = byMon[id] || { id, total: 0, performed: 0, shiny: 0, last: '', exerciseName: c.exerciseName };
    cur.total++;
    if (c.didPerform === 'true') cur.performed++;
    if (c.isShiny === 'true') cur.shiny++;
    if (c.createdAt > cur.last) { cur.last = c.createdAt; cur.exerciseName = c.exerciseName; }
    byMon[id] = cur;
  }

  const list = Object.values(byMon).sort((a, b) => b.total - a.total);
  const grid = el('div', { class: 'dex-grid' });
  for (const m of list) {
    const hasShiny = m.shiny > 0;
    grid.appendChild(el('div', { class: `dex-card ${hasShiny ? 'shiny' : ''}` },
      el('img', {
        class: 'dex-sprite',
        src: spritePath(m.id, { shiny: hasShiny }),
        alt: m.id,
        onerror: (e) => { e.target.src = spritePath('unknown'); },
      }),
      el('div', { class: 'dex-name' }, hasShiny ? '★ ' : '', m.id),
      el('div', { class: 'dex-ex' }, m.exerciseName),
      el('div', { class: 'dex-counts' },
        el('span', {}, `×${m.total}`),
        el('span', { class: 'dex-sub' }, `${m.performed}/${m.total} done`),
      ),
    ));
  }
  root.appendChild(grid);
}
