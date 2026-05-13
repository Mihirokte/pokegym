// Demo mode — populates the mirror with realistic sample data so the full
// UI is walkable without any Google setup. All writes stay in localStorage;
// sync.flush() + bootstrap are bypassed when demo is on.

import { APP, XP } from './config.js';
import { lsGet, lsSet, lsRemove, readMirror, writeMirror } from './storage.js';
import { DAYS } from './data/days.js';
import { TEAMS } from './data/pokemon.js';
import { LEADERS } from './data/leaders.js';
import { EXERCISES } from './data/exercises.js';
import { uid, nowISO, todayISO, dayIndexFromDate, mondayOfWeekISO } from './util.js';

const DEMO_KEY = 'pokegym.demo';

export function isDemo() { return !!lsGet(DEMO_KEY, false); }

export function enterDemo() {
  lsSet(DEMO_KEY, true);
  seedMirror();
}

export function exitDemo() {
  lsRemove(DEMO_KEY);
  // Clear mirror + draft so the user starts fresh when they sign in for real.
  lsRemove(APP.lsKey.mirror);
  lsRemove(APP.lsKey.sessionDraft);
  lsRemove(APP.lsKey.queue);
}

// ── Seed data ────────────────────────────────────────────────────────────

function seedMirror() {
  const mirror = {
    Sessions:         seedSessions(),
    SetLog:           seedSetLog(),
    PokeballCatches:  seedCatches(),
    Badges:           seedBadges(),
    TeamState:        seedTeamState(),
    CustomExercises:  seedCustomExercises(),
    Meta:             [],
  };
  writeMirror(mirror);
}

// Build a realistic recent training history. Weeks where the user hit ≥6
// sessions qualify for a badge; we make the last full week earn one.
function seedSessions() {
  const sessions = [];
  const today = new Date();
  const todayIdx = dayIndexFromDate(today);

  // ── Last full week (Mon–Sun ending last Sunday) — 6 sessions, 1 badge ──
  const lastMonday = new Date(today);
  lastMonday.setDate(lastMonday.getDate() - todayIdx - 7);

  const lastWeekSchedule = [0, 1, 2, 3, 4, 5]; // Mon-Sat, skipped Sun
  for (const dayOffset of lastWeekSchedule) {
    const d = new Date(lastMonday);
    d.setDate(d.getDate() + dayOffset);
    sessions.push(mkSession(d, DAYS[dayOffset], 3, 3));
  }

  // ── This week so far — Mon Tue Thu (missed Wed) up to yesterday ──────
  const thisMonday = new Date(lastMonday);
  thisMonday.setDate(thisMonday.getDate() + 7);
  const doneThisWeek = [];
  if (todayIdx >= 0) doneThisWeek.push(0);                       // Mon
  if (todayIdx >= 1) doneThisWeek.push(1);                       // Tue
  if (todayIdx >= 3) doneThisWeek.push(3);                       // Thu — skip Wed
  // Today is in-progress, no session row for it yet.
  for (const dayOffset of doneThisWeek) {
    const d = new Date(thisMonday);
    d.setDate(d.getDate() + dayOffset);
    // Vary completion to feel organic
    const done = dayOffset === 3 ? 2 : 3;
    sessions.push(mkSession(d, DAYS[dayOffset], done, 3));
  }

  return sessions;
}

function mkSession(date, day, sectionsDone, totalSections) {
  const iso = date.toISOString().slice(0, 10);
  return {
    id: uid('sess'),
    dateISO: iso,
    dayIndex: String(day.index),
    dayKey: day.key,
    focus: day.focus,
    sectionsDone: String(sectionsDone),
    totalSections: String(totalSections),
    pctComplete: String(Math.round((sectionsDone / totalSections) * 100)),
    durationMin: String(45 + Math.floor(Math.random() * 25)),
    notes: '',
    createdAt: date.toISOString(),
    updatedAt: date.toISOString(),
  };
}

// One row per set — sample 6 exercises over the last few sessions
function seedSetLog() {
  const rows = [];
  const today = new Date();
  const samples = [
    { exId: 'push-bench-bb', section: 'workout', sets: [{w:50,r:10},{w:55,r:8},{w:55,r:7},{w:55,r:6}], daysAgo: 1 },
    { exId: 'push-incline-db', section: 'workout', sets: [{w:18,r:10},{w:18,r:10},{w:18,r:9}], daysAgo: 1 },
    { exId: 'push-lateral-db', section: 'workout', sets: [{w:8,r:15},{w:8,r:14},{w:8,r:12}], daysAgo: 1 },
    { exId: 'lo-squat-bb', section: 'workout', sets: [{w:70,r:8},{w:75,r:8},{w:75,r:7},{w:75,r:6}], daysAgo: 2 },
    { exId: 'lo-rdl-bb', section: 'workout', sets: [{w:60,r:10},{w:65,r:10},{w:65,r:9}], daysAgo: 2 },
    { exId: 'pull-latpull', section: 'workout', sets: [{w:45,r:12},{w:50,r:10},{w:50,r:10}], daysAgo: 4 },
    { exId: 'pull-row-bb', section: 'workout', sets: [{w:55,r:10},{w:60,r:9},{w:60,r:8}], daysAgo: 4 },
    { exId: 'pull-curl-ez', section: 'workout', sets: [{w:25,r:12},{w:25,r:10},{w:22,r:10}], daysAgo: 4 },
  ];

  for (const s of samples) {
    const d = new Date(today); d.setDate(d.getDate() - s.daysAgo);
    const ex = EXERCISES[s.exId];
    s.sets.forEach((set, i) => rows.push({
      id: uid('set'),
      sessionId: 'demo',
      dateISO: d.toISOString().slice(0, 10),
      exerciseId: s.exId,
      exerciseName: ex.name,
      section: s.section,
      setNumber: String(i + 1),
      weight: String(set.w),
      weightUnit: 'kg',
      reps: String(set.r),
      isTime: 'false',
      rpe: '',
      notes: '',
      createdAt: d.toISOString(),
    }));
  }
  return rows;
}

function seedCatches() {
  const today = new Date();
  const mk = (daysAgo, pokemonId, exId, shiny = false, performed = true) => {
    const d = new Date(today); d.setDate(d.getDate() - daysAgo);
    const ex = EXERCISES[exId];
    return {
      id: uid('pb'),
      dateISO: d.toISOString().slice(0, 10),
      exerciseId: exId,
      exerciseName: ex.name,
      pokemonId,
      pokemonName: pokemonId,
      isShiny: shiny ? 'true' : 'false',
      didPerform: performed ? 'true' : 'false',
      setsDone: performed ? String(ex.defaultSets) : '0',
      notes: 'demo',
      createdAt: d.toISOString(),
    };
  };

  return [
    mk(12, 'primeape',   'wild-burpee'),
    mk(10, 'geodude',    'glu-wall-sit'),
    mk(9,  'pikachu',    'wild-jump-rope'),
    mk(7,  'aipom',      'wild-mountain'),
    mk(6,  'scyther',    'cond-box-jump'),
    mk(5,  'tauros',     'cond-sled-push', true), // shiny!
    mk(3,  'hitmonlee',  'wild-dip'),
    mk(2,  'cubone',     'cond-kb-swing'),
    mk(1,  'machamp',    'fb-farmer'),
    mk(1,  'mankey',     'wild-ring-row', false, false), // it fled
  ];
}

function seedBadges() {
  // One badge earned last week — Brock's Boulder Badge
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - dayIndexFromDate() - 7);
  return [{
    id: uid('badge'),
    weekStartISO: weekStart.toISOString().slice(0, 10),
    badgeIndex: '0',
    badgeKey: LEADERS[0].key,
    leaderName: LEADERS[0].name,
    earnedAt: new Date(weekStart.getTime() + 6 * 86400_000).toISOString(),
    workoutsCompleted: '6',
    streak: '1',
  }];
}

function seedTeamState() {
  // Mixed progression — some evolved, some still baby
  const spec = {
    mon: { level: 12, xp: 45,  stage: 1 },
    tue: { level: 18, xp: 30,  stage: 1 },
    wed: { level: 6,  xp: 10,  stage: 0 },
    thu: { level: 10, xp: 20,  stage: 1 },
    fri: { level: 9,  xp: 40,  stage: 0 },
    sat: { level: 15, xp: 25,  stage: 1 },
    sun: { level: 8,  xp: 15,  stage: 0 },
  };
  const out = [];
  for (const [dayKey, s] of Object.entries(spec)) {
    const team = teamFor(dayKey);
    const stage = Math.min(team.line.length - 1, s.stage);
    const mon = team.line[stage];
    out.push({
      id: dayKey,
      dayKey,
      pokemonId: mon.slug,
      pokemonName: mon.name,
      stage: String(stage),
      level: String(s.level),
      xp: String(s.xp),
      isShiny: 'false',
      lastWorkoutISO: todayISO(),
      updatedAt: nowISO(),
    });
  }
  return out;
}

function teamFor(dayKey) {
  const map = { mon: 'fighter', tue: 'rock', wed: 'electric', thu: 'grappler', fri: 'aura', sat: 'dragon', sun: 'rest' };
  return TEAMS[map[dayKey]];
}

function seedCustomExercises() {
  return [{
    id: 'custom-demo-1',
    name: 'Nordic Hamstring Curl',
    section: 'workout',
    muscle: 'hamstrings',
    equipment: 'pad',
    type: 'strength',
    defaultSets: '3',
    defaultReps: '6',
    trackLoad: 'false',
    isTime: 'false',
    cue: 'Slow eccentric — 5 seconds down is the whole point.',
    addedAt: nowISO(),
  }];
}
