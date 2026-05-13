// The main workout screen — one day at a time. For the current day we show
// three sections (warmup / workout / cooldown). Each exercise card lets you
// log weight+reps per set with a tap to check off, and opens the rest timer.

import { el, mount, haptic, todayISO, nowISO, uid, pct, dayIndexFromDate } from '../util.js';
import { DAYS, dayByKey, dayByIndex, sectionsOf } from '../data/days.js';
import { getExercise } from '../data/exercises.js';
import { TEAMS, teamMemberFromState, teamForDay } from '../data/pokemon.js';
import { XP, TIMER_DEFAULTS, APP } from '../config.js';
import { spritePath, ballPath } from '../util.js';
import { mirrorSheet, lsGet, lsSet, getSettings } from '../storage.js';
import { appendRow, upsertRow } from '../sync.js';
import { mountTimer, start as startTimer } from './timer.js';
import * as Wake from './wake.js';
import { toast } from './toast.js';
import { openPokeball } from './pokeball.js';

// Active session is kept as a draft in localStorage so refresh doesn't lose
// in-progress work. Committed rows are already synced via sync.appendRow.

const DRAFT_KEY = APP.lsKey.sessionDraft;

function readDraft() { return lsGet(DRAFT_KEY, null); }
function writeDraft(d) { lsSet(DRAFT_KEY, d); }

function newDraft(dayKey) {
  const sessionId = uid('sess');
  return {
    sessionId,
    dayKey,
    dateISO: todayISO(),
    startedAt: nowISO(),
    sets: {}, // { [`${section}-${exId}`]: [{weight, reps, done, logged, rowId}, ...] }
    checked: {}, // for isometric/bodyweight exercises — quick check per set
  };
}

// ── View state ────────────────────────────────────────────────────────────
let currentDayIdx = dayIndexFromDate();

export function renderSessions(root) {
  // Tabs + content container
  root.innerHTML = '';
  const tabsEl = el('div', { class: 'day-tabs' });
  const content = el('div', { class: 'session-content' });

  const renderTabs = () => {
    tabsEl.innerHTML = '';
    for (const d of DAYS) {
      const active = currentDayIdx === d.index;
      tabsEl.appendChild(el('button', {
        class: `day-tab ${active ? 'active' : ''}`,
        type: 'button',
        style: active ? { '--c': d.color, borderColor: d.color, color: d.color } : {},
        onClick: () => { currentDayIdx = d.index; renderTabs(); renderContent(); haptic(8); },
      },
        el('span', { class: 'day-tab-short' }, d.short),
        el('span', { class: 'day-tab-focus' }, d.focus.split(' ')[0]),
      ));
    }
  };

  const renderContent = () => {
    const day = dayByIndex(currentDayIdx);
    content.innerHTML = '';
    content.appendChild(renderHeader(day));
    if (day.rest) {
      content.appendChild(renderRestDay(day));
    } else {
      content.appendChild(renderSessionBody(day));
    }
    content.appendChild(renderFooter(day));
  };

  root.append(tabsEl, content);
  renderTabs();
  renderContent();
}

// ── Header: day title, tag, lead pokemon ──────────────────────────────────
function renderHeader(day) {
  const team = teamForDay(day.key);
  const teamRow = mirrorSheet('TeamState').find(r => r.dayKey === day.key);
  const stage = Math.max(0, Math.min(team.line.length - 1, Number(teamRow?.stage || 0)));
  const mon = team.line[stage];
  const isShiny = teamRow?.isShiny === 'true';
  const level = Number(teamRow?.level || 1);

  const head = el('header', { class: 'session-head', style: { '--c': day.color, '--a': day.accent } },
    el('div', { class: 'head-left' },
      el('div', { class: 'tag', style: { color: day.color } }, day.tag),
      el('h1', { class: 'focus' }, day.focus),
      el('div', { class: 'sub' }, `${day.label} · Tap exercises to check off, hold to log sets.`),
    ),
    el('div', { class: 'head-right' },
      el('img', { class: 'mon-sprite', src: spritePath(mon.slug, { shiny: isShiny }), alt: mon.name }),
      el('div', { class: 'mon-name' }, mon.name, isShiny ? ' ★' : ''),
      el('div', { class: 'mon-level' }, `Lv. ${level}`),
    ),
  );
  return head;
}

// ── Body ──────────────────────────────────────────────────────────────────
function renderSessionBody(day) {
  let draft = readDraft();
  if (!draft || draft.dayKey !== day.key || draft.dateISO !== todayISO()) {
    draft = newDraft(day.key);
    writeDraft(draft);
  }

  const body = el('div', { class: 'sections' });
  const sections = sectionsOf(day);
  for (const sec of sections) {
    body.appendChild(renderSection(day, sec, draft));
  }

  // Pokeball + finish row
  const actions = el('div', { class: 'session-actions' },
    el('button', { class: 'pokeball-btn', type: 'button', onClick: () => openPokeball(draft.sessionId) },
      el('img', { src: ballPath('poke'), alt: '' }),
      el('span', {}, 'Pokéball — Random Exercise'),
    ),
    el('button', { class: 'finish-btn', type: 'button', onClick: () => finishDay(day) },
      'Finish Day',
    ),
  );
  body.appendChild(actions);
  return body;
}

function renderSection(day, section, draft) {
  const custom = Object.fromEntries(mirrorSheet('CustomExercises').map(x => [x.id, x]));
  const list = el('div', { class: 'ex-list' });
  const exercises = section.ids.map(id => getExercise(id, custom));

  for (const ex of exercises) list.appendChild(renderExerciseCard(day, section, ex, draft));

  const doneCount = exercises.filter(ex => isExerciseDone(draft, section.key, ex)).length;
  const header = el('div', { class: 'sec-head', style: { '--c': day.color, '--a': day.accent } },
    el('div', { class: 'sec-title' },
      el('span', { class: 'sec-dot' }),
      el('span', { class: 'sec-label' }, section.label),
    ),
    el('div', { class: 'sec-count' }, `${doneCount} / ${exercises.length}`),
  );

  const wrap = el('section', { class: `sec sec-${section.key}` }, header, list);
  return wrap;
}

function renderExerciseCard(day, section, ex, draft) {
  const key = `${section.key}-${ex.id}`;
  const sets = draft.sets[key] ||= initSets(ex);
  const allDone = sets.every(s => s.done);

  const card = el('div', { class: `ex-card ${allDone ? 'done' : ''}`, style: { '--c': day.color } });

  const head = el('div', { class: 'ex-head' },
    el('button', { class: `ex-check ${allDone ? 'checked' : ''}`, type: 'button', onClick: () => toggleAll(sets, card, day, section) }),
    el('div', { class: 'ex-meta' },
      el('div', { class: 'ex-name' }, ex.name),
      ex.cue && el('div', { class: 'ex-cue' }, ex.cue),
    ),
    el('div', { class: 'ex-target' }, `${ex.defaultSets}×${ex.defaultReps}`),
  );

  const setsWrap = el('div', { class: 'sets-wrap' });
  const renderSets = () => {
    setsWrap.innerHTML = '';
    sets.forEach((s, i) => setsWrap.appendChild(renderSetRow(ex, section, sets, i, card, day)));
    const addBtn = el('button', { class: 'add-set', type: 'button', onClick: () => {
      sets.push(emptySet(ex));
      saveDraft(draft); renderSets();
    } }, '+ Add set');
    setsWrap.appendChild(addBtn);
  };
  renderSets();

  const timerBtn = el('button', { class: 'ex-timer', type: 'button', onClick: () =>
    startTimer(defaultRest(section.key), { label: `Rest — ${ex.name}` }) }, '⏱ Rest');

  card.append(head, setsWrap, timerBtn);
  return card;
}

function renderSetRow(ex, section, sets, i, card, day) {
  const s = sets[i];
  const row = el('div', { class: `set-row ${s.done ? 'done' : ''}` });
  row.appendChild(el('div', { class: 'set-num' }, i + 1));

  if (ex.trackLoad) {
    row.appendChild(numberInput('kg', s.weight, v => { s.weight = v; saveSetRow(s, ex, section); }));
  } else {
    row.appendChild(el('div', { class: 'set-input muted' }, ex.equipment === 'bodyweight' ? 'BW' : '—'));
  }

  row.appendChild(numberInput(ex.isTime ? 'sec' : 'reps', s.reps, v => { s.reps = v; saveSetRow(s, ex, section); }));

  const checkBtn = el('button', { class: `set-check ${s.done ? 'checked' : ''}`, type: 'button', onClick: () => {
    s.done = !s.done;
    haptic(s.done ? 18 : 6);
    if (s.done) {
      s.completedAt = nowISO();
      commitSet(s, ex, section);
      // auto-start rest timer unless it's the last set
      if (i < sets.length - 1) startTimer(defaultRest(section.key), { label: `Rest — ${ex.name}` });
      refreshCardClasses(card);
    } else {
      s.completedAt = '';
    }
    row.classList.toggle('done', s.done);
    checkBtn.classList.toggle('checked', s.done);
    saveAllCurrentDraft();
    recomputeSectionCount(card);
  } }, '✓');

  row.appendChild(checkBtn);

  return row;
}

function numberInput(placeholder, value, onChange) {
  const input = el('input', {
    class: 'set-input',
    type: 'number',
    inputmode: 'decimal',
    placeholder,
    value: value ?? '',
  });
  input.addEventListener('input', () => onChange(input.value));
  input.addEventListener('focus', () => input.select());
  return input;
}

// ── Draft helpers ─────────────────────────────────────────────────────────
function initSets(ex) {
  return Array.from({ length: ex.defaultSets }, () => emptySet(ex));
}
function emptySet(ex) {
  return { weight: '', reps: '', done: false, logged: false, rowId: uid('set') };
}
function isExerciseDone(draft, sectionKey, ex) {
  const key = `${sectionKey}-${ex.id}`;
  const sets = draft.sets[key];
  return Array.isArray(sets) && sets.length > 0 && sets.every(s => s.done);
}
function defaultRest(sectionKey) { return TIMER_DEFAULTS[sectionKey] ?? 90; }

function saveDraft(draft) { writeDraft(draft); }
function saveAllCurrentDraft() { writeDraft(readDraft()); }

function toggleAll(sets, card, day, section) {
  const turnOn = !sets.every(s => s.done);
  sets.forEach(s => {
    s.done = turnOn;
    if (turnOn) s.completedAt = nowISO();
  });
  haptic(turnOn ? 22 : 10);
  saveAllCurrentDraft();
  card.querySelectorAll('.set-row').forEach((r, i) => {
    r.classList.toggle('done', sets[i].done);
    r.querySelector('.set-check').classList.toggle('checked', sets[i].done);
  });
  refreshCardClasses(card);
  recomputeSectionCount(card);
  if (turnOn) {
    // log all sets as a batch
    const draft = readDraft();
    sets.forEach(s => {
      if (!s.logged) {
        const ex = exerciseFromCardElement(card);
        const sec = sectionFromCardElement(card);
        commitSet(s, ex, sec);
      }
    });
  }
}

function refreshCardClasses(card) {
  const sets = card.querySelectorAll('.set-row');
  const allDone = sets.length > 0 && Array.from(sets).every(r => r.classList.contains('done'));
  card.classList.toggle('done', allDone);
  const head = card.querySelector('.ex-check');
  head?.classList.toggle('checked', allDone);
}

function recomputeSectionCount(card) {
  const sec = card.closest('.sec');
  if (!sec) return;
  const total = sec.querySelectorAll('.ex-card').length;
  const done = sec.querySelectorAll('.ex-card.done').length;
  const countEl = sec.querySelector('.sec-count');
  if (countEl) countEl.textContent = `${done} / ${total}`;
}

function exerciseFromCardElement(card) {
  // Best-effort reverse lookup by exercise-name text.
  const name = card.querySelector('.ex-name')?.textContent || '';
  const all = mirrorSheet('CustomExercises');
  // Defer to imported getExercise via master map + custom
  const custom = Object.fromEntries(all.map(x => [x.id, x]));
  // Attempt name match — not reliable but only used on toggleAll fallback.
  // Better to keep a dataset attribute — handled below.
  return card._ex || {
    id: card.dataset.exId || '',
    name,
    section: card.dataset.section || 'workout',
    isTime: false,
    trackLoad: true,
  };
}
function sectionFromCardElement(card) {
  const key = card.closest('.sec')?.className.match(/sec-(\w+)/)?.[1] || 'workout';
  return { key, label: key };
}

function commitSet(s, ex, section) {
  if (s.logged) return;
  const draft = readDraft();
  const setIndex = Number(s.setNum || 0); // optional
  const row = {
    id: s.rowId,
    sessionId: draft.sessionId,
    dateISO: draft.dateISO,
    exerciseId: ex.id,
    exerciseName: ex.name,
    section: section.key,
    setNumber: setIndex || (draft.sets[`${section.key}-${ex.id}`]?.indexOf(s) + 1) || 1,
    weight: s.weight || '',
    weightUnit: getSettings().weightUnit,
    reps: s.reps || '',
    isTime: ex.isTime ? 'true' : 'false',
    rpe: '',
    notes: '',
    createdAt: s.completedAt || nowISO(),
  };
  s.logged = true;
  appendRow('SetLog', row);
}

// ── Finish day ────────────────────────────────────────────────────────────
function finishDay(day) {
  const draft = readDraft();
  if (!draft || draft.dayKey !== day.key) {
    toast('No active session to finish', 'warn');
    return;
  }
  // Count completed sections.
  const sections = sectionsOf(day);
  let done = 0; let total = 0;
  for (const sec of sections) {
    const exList = sec.ids;
    let secDone = true;
    for (const id of exList) {
      const key = `${sec.key}-${id}`;
      const sets = draft.sets[key];
      if (!sets || !sets.every(s => s.done)) { secDone = false; break; }
    }
    if (secDone) done++;
    total++;
  }

  const row = {
    id: draft.sessionId,
    dateISO: draft.dateISO,
    dayIndex: day.index,
    dayKey: day.key,
    focus: day.focus,
    sectionsDone: done,
    totalSections: total,
    pctComplete: pct(done, total),
    durationMin: Math.max(1, Math.round((Date.now() - new Date(draft.startedAt).getTime()) / 60000)),
    notes: '',
    createdAt: draft.startedAt,
    updatedAt: nowISO(),
  };
  appendRow('Sessions', row);
  awardTeamXP(day, done, total);
  maybeAwardBadge();
  writeDraft(null);

  toast(`Session logged · ${row.pctComplete}% complete`, 'ok');
  haptic([30, 40, 30]);
  Wake.release();

  // Rerender
  const host = document.querySelector('.session-content');
  if (host) {
    const parent = host.parentElement;
    parent.innerHTML = '';
    renderSessions(parent);
  }
}

// ── Rest day view ─────────────────────────────────────────────────────────
function renderRestDay(day) {
  const body = el('div', { class: 'rest-day' },
    el('div', { class: 'rest-tips' },
      ...day.restTips.map((t, i) => el('div', { class: 'rest-tip' },
        el('span', { class: 'rest-dot' }), el('span', {}, t),
      )),
    ),
    el('div', { class: 'stats-grid' },
      ...day.stats.map(s => el('div', { class: 'stat' },
        el('div', { class: 'stat-label' }, s.label),
        el('div', { class: 'stat-value' }, s.value),
      )),
    ),
    el('div', { class: 'prof-note' },
      el('strong', {}, "Professor's note — "),
      'Maintain a 400–500 kcal daily deficit. Keep protein ≥ 1.8 g/kg. Floor at 1,800 kcal to preserve energy.',
    ),
  );
  return body;
}

// ── Footer bar ────────────────────────────────────────────────────────────
function renderFooter(day) {
  const sets = mirrorSheet('SetLog');
  const today = todayISO();
  const todaysSets = sets.filter(s => s.dateISO === today).length;
  return el('footer', { class: 'session-foot' },
    el('div', { class: 'foot-stat' }, `${todaysSets} sets today`),
    el('button', {
      class: 'wake-btn',
      type: 'button',
      onClick: async () => {
        const ok = await Wake.acquire();
        toast(ok ? 'Screen will stay on' : 'Wake lock not supported', ok ? 'ok' : 'warn');
      },
    }, '☀ Keep screen on'),
  );
}

// ── XP + Badge award ──────────────────────────────────────────────────────
function awardTeamXP(day, sectionsDone, totalSections) {
  const gained = sectionsDone * XP.perSectionDone + (sectionsDone === totalSections ? XP.fullDayBonus : 0);
  if (gained <= 0) return;

  const all = mirrorSheet('TeamState');
  const row = all.find(r => r.dayKey === day.key) || { dayKey: day.key };
  const team = teamForDay(day.key);
  let xp = Number(row.xp || 0) + gained;
  let level = Number(row.level || 1);
  while (level < XP.levelTable.length - 1 && xp >= XP.levelTable[level]) level++;
  let stage = Number(row.stage || 0);
  for (let s = stage; s < XP.evolveAt.length; s++) {
    if (level >= XP.evolveAt[s]) stage = s + 1;
  }
  stage = Math.min(stage, team.line.length - 1);
  const mon = team.line[stage];
  const updated = {
    ...row,
    id: day.key,
    dayKey: day.key,
    pokemonId: mon.slug,
    pokemonName: mon.name,
    stage,
    level,
    xp,
    isShiny: row.isShiny || 'false',
    lastWorkoutISO: todayISO(),
    updatedAt: nowISO(),
  };
  upsertRow('TeamState', updated);

  if (Number(row.stage || 0) < stage) {
    toast(`${team.line[stage - 1].name} evolved into ${mon.name}!`, 'ok', { ms: 4200 });
    haptic([40, 60, 40, 60, 80]);
  }
}

function maybeAwardBadge() {
  import('./badges.js').then(m => m.evaluateBadges?.()).catch(() => {});
}

// Expose for debugging
if (typeof window !== 'undefined') window.__pokegymSession = { readDraft, writeDraft };
