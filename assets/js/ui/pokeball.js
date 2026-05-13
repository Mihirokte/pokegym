// "Pokéball — Random Exercise" modal. Full-screen takeover that rolls a
// random wild exercise, shows the reveal, lets you perform it, log it, or
// throw it back.

import { el, mount, haptic, pick, rollShiny, todayISO, nowISO, uid, spritePath, ballPath } from '../util.js';
import { wildPool } from '../data/exercises.js';
import { mirrorSheet, getSettings } from '../storage.js';
import { appendRow } from '../sync.js';
import { toast } from './toast.js';

let overlay;

export function openPokeball(sessionId = null) {
  close();

  const custom = Object.fromEntries(mirrorSheet('CustomExercises').map(x => [x.id, x]));
  const pool = wildPool(custom);
  if (pool.length === 0) {
    toast('No wild exercises in the pool — add one!', 'warn');
    return;
  }
  const ex = pick(pool);
  const shiny = rollShiny(getSettings().shinyStreakBonus ? 128 : 256);
  const mon = ex.pokemon || 'voltorb';

  overlay = el('div', { class: 'pokeball-overlay', role: 'dialog', 'aria-modal': 'true' });

  const stage = el('div', { class: 'pb-stage' });
  const ball = el('img', { class: 'pb-ball', src: ballPath('poke'), alt: 'Pokéball' });
  stage.appendChild(ball);

  overlay.appendChild(stage);
  document.body.appendChild(overlay);

  haptic([10, 80, 30, 80, 30, 80]);

  // Rolling animation
  setTimeout(() => ball.classList.add('shake'), 100);
  setTimeout(() => ball.classList.add('opened'), 1400);
  setTimeout(() => reveal(ex, mon, shiny, sessionId), 1700);
}

function reveal(ex, mon, shiny, sessionId) {
  if (!overlay) return;
  overlay.innerHTML = '';

  const card = el('div', { class: `pb-card ${shiny ? 'shiny' : ''}` },
    el('div', { class: 'pb-sparkles' }),
    el('img', {
      class: 'pb-mon',
      src: spritePath(mon, { shiny }),
      alt: ex.name,
      onerror: (e) => { e.target.src = spritePath('unknown'); },
    }),
    el('div', { class: 'pb-announce' }, shiny ? '✨ Wild Shiny appeared!' : 'A wild exercise appeared!'),
    el('h2', { class: 'pb-ex-name' }, ex.name),
    el('div', { class: 'pb-target' }, `${ex.defaultSets} × ${ex.defaultReps}`),
    ex.cue && el('div', { class: 'pb-cue' }, ex.cue),
    el('div', { class: 'pb-muscle' }, [ex.muscle, ex.equipment].filter(Boolean).join(' · ')),
    el('div', { class: 'pb-actions' },
      el('button', { class: 'pb-btn primary', type: 'button', onClick: () => caught(ex, mon, shiny, sessionId, true) }, '✓ I did it'),
      el('button', { class: 'pb-btn', type: 'button', onClick: () => caught(ex, mon, shiny, sessionId, false) }, 'Skip'),
      el('button', { class: 'pb-btn ghost', type: 'button', onClick: reroll }, '🎲 Re-roll'),
    ),
  );
  overlay.appendChild(card);
  setTimeout(() => card.classList.add('in'), 20);
  if (shiny) haptic([20, 40, 20, 40, 20, 200]);
}

function caught(ex, mon, shiny, sessionId, didPerform) {
  appendRow('PokeballCatches', {
    id: uid('pb'),
    dateISO: todayISO(),
    exerciseId: ex.id,
    exerciseName: ex.name,
    pokemonId: mon,
    pokemonName: mon,
    isShiny: shiny ? 'true' : 'false',
    didPerform: didPerform ? 'true' : 'false',
    setsDone: didPerform ? String(ex.defaultSets) : '0',
    notes: sessionId ? `session:${sessionId}` : '',
    createdAt: nowISO(),
  });
  toast(didPerform ? `Caught ${mon}!` : 'Fled.', didPerform ? 'ok' : 'info');
  close();
}

function reroll() {
  close();
  setTimeout(() => openPokeball(), 80);
}

export function close() {
  if (overlay) { overlay.remove(); overlay = null; }
}

// Close on Esc
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}
