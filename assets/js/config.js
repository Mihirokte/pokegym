// PokeGym — central configuration.
// Edit APP_DEFAULTS at will. Sheet schema is versioned below.

export const APP = {
  name: 'PokeGym',
  version: '1.0.0',
  spreadsheetName: 'PokeGym Data',
  // localStorage keys (all namespaced)
  lsKey: {
    clientId:     'pokegym.clientId',
    auth:         'pokegym.auth',
    scopesV:      'pokegym.scopesV',
    mirror:       'pokegym.mirror',       // local copy of sheet rows
    queue:        'pokegym.queue',        // offline write queue
    settings:     'pokegym.settings',     // user prefs
    lastSync:     'pokegym.lastSync',
    sessionDraft: 'pokegym.sessionDraft', // active session in progress
  },
};

// Bump this when we add/change scopes so stale tokens are refreshed.
export const SCOPES_VERSION = 1;

export const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
].join(' ');

// ── Sheet schema ───────────────────────────────────────────────────────────
// Every tab has a stable internal name (left) and a numbered human-readable
// tab title (right) so sorting the tabs in the Sheet UI is intuitive.

export const SHEET_NAMES = [
  'Sessions',
  'SetLog',
  'PokeballCatches',
  'Badges',
  'TeamState',
  'CustomExercises',
  'Meta',
];

export const TAB_NAMES = {
  Sessions:        '01_Sessions',
  SetLog:          '02_SetLog',
  PokeballCatches: '03_PokeballCatches',
  Badges:          '04_Badges',
  TeamState:       '05_TeamState',
  CustomExercises: '06_CustomExercises',
  Meta:            '07_Meta',
};

// Reverse lookup: tab title -> internal name
export const TAB_TO_SHEET = Object.fromEntries(
  Object.entries(TAB_NAMES).map(([k, v]) => [v, k])
);

export function tabName(sheet) {
  return TAB_NAMES[sheet];
}

// Column order is the source of truth. When we append/update rows, values
// are placed in this order. Don't reorder without a migration.
export const SHEET_HEADERS = {
  Sessions: [
    'id',             // uuid/ulid
    'dateISO',        // YYYY-MM-DD
    'dayIndex',       // 0=Mon ... 6=Sun
    'dayKey',         // 'mon' | 'tue' | ...
    'focus',          // human-readable day focus
    'sectionsDone',   // int — warmup/workout/cooldown completed
    'totalSections',
    'pctComplete',    // 0-100
    'durationMin',    // actual session length
    'notes',
    'createdAt',      // ISO timestamp
    'updatedAt',
  ],
  SetLog: [
    'id',
    'sessionId',
    'dateISO',
    'exerciseId',
    'exerciseName',
    'section',        // 'warmup' | 'workout' | 'cooldown'
    'setNumber',      // 1-based
    'weight',         // number or '' (bodyweight)
    'weightUnit',     // 'kg' | 'lb' | ''
    'reps',           // number or duration in seconds (when isTime)
    'isTime',         // 'true' | 'false' — if true, reps is seconds
    'rpe',            // 1-10 or ''
    'notes',
    'createdAt',
  ],
  PokeballCatches: [
    'id',
    'dateISO',
    'exerciseId',
    'exerciseName',
    'pokemonId',
    'pokemonName',
    'isShiny',        // 'true' | 'false'
    'didPerform',     // 'true' | 'false'
    'setsDone',
    'notes',
    'createdAt',
  ],
  Badges: [
    'id',
    'weekStartISO',   // Monday of the week
    'badgeIndex',     // 0-based global index (0..7 Kanto, 8..11 E4, 12+ Champion)
    'badgeKey',       // 'boulder' | 'cascade' | ...
    'leaderName',
    'earnedAt',
    'workoutsCompleted',
    'streak',
  ],
  TeamState: [
    'dayKey',         // 'mon' | 'tue' | ...
    'pokemonId',      // current form (machop/machoke/machamp)
    'pokemonName',
    'stage',          // 0..2
    'level',          // 1-100
    'xp',             // accumulates within stage
    'isShiny',        // 'true' | 'false'
    'lastWorkoutISO',
    'updatedAt',
  ],
  CustomExercises: [
    'id',
    'name',
    'section',        // default section
    'muscle',
    'equipment',
    'type',           // strength | cardio | mobility | isometric
    'defaultSets',
    'defaultReps',
    'trackLoad',      // 'true' | 'false'
    'cue',
    'addedAt',
  ],
  Meta: [
    'key',
    'value',
    'updatedAt',
  ],
};

// XP curve for team mons. Stage 0 -> Stage 1 at level 10, Stage 1 -> Stage 2
// at level 25. XP per workout: sectionsDone * 5 + bonus for 100%.
export const XP = {
  perSectionDone: 5,
  fullDayBonus: 10,
  pokeballCatch: 3,
  levelTable: [0, 20, 50, 90, 140, 200, 270, 350, 440, 540, 650, 770, 900,
               1040, 1190, 1350, 1520, 1700, 1890, 2090, 2300, 2520, 2750,
               2990, 3240, 3500], // index = level
  evolveAt: [10, 25], // stage transitions
};

// Rest-timer defaults (seconds). User can override per-exercise later.
export const TIMER_DEFAULTS = {
  warmup: 30,
  workout: 90,
  cooldown: 20,
  // Presets shown in UI
  presets: [30, 60, 90, 120, 180],
};
