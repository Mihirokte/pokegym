// Push / Pull / Legs split (PPL x2 + Sunday rest). Each day umbrella-covers
// its movement pattern with one compound per muscle group plus complementary
// accessories — no within-day overlap on the same muscle.
//
// A/B emphasis splits the volume across the week:
//   Push A — chest-focused | Push B — shoulder-focused
//   Pull A — width (vertical/lats) | Pull B — thickness (horizontal/rows)
//   Legs A — quad-focused | Legs B — glute/posterior-focused

export const DAYS = [
  {
    key: 'mon',
    index: 0,
    label: 'Monday',
    short: 'MON',
    focus: 'Push A',
    tag: 'PUSH · CHEST',
    color: '#B85C3D',       // burnt sienna
    accent: '#D89073',
    team: 'fighter',
    warmup: ['wm-bike-assault', 'wm-band-pull-apart', 'wm-shoulder-cars', 'wm-bar-warmup'],
    workout: ['push-bench-bb', 'push-incline-db', 'push-cable-fly', 'push-ohp-db', 'push-lateral-db', 'push-tri-pushdown'],
    cooldown: ['cd-doorway-pec', 'cd-shoulder-cross', 'cd-child-pose'],
  },
  {
    key: 'tue',
    index: 1,
    label: 'Tuesday',
    short: 'TUE',
    focus: 'Pull A',
    tag: 'PULL · WIDTH',
    color: '#6B8E6B',       // sage
    accent: '#94B294',
    team: 'grappler',
    warmup: ['wm-row-erg', 'wm-band-pull-apart', 'wm-scap-pullup'],
    workout: ['pull-latpull', 'pull-row-cable', 'pull-face-pull', 'pull-curl-ez', 'pull-curl-hammer', 'fb-hang-leg'],
    cooldown: ['cd-lat-doorway', 'cd-thread-needle', 'cd-child-pose'],
  },
  {
    key: 'wed',
    index: 2,
    label: 'Wednesday',
    short: 'WED',
    focus: 'Legs A',
    tag: 'LEGS · QUADS',
    color: '#8B6F47',       // bronze
    accent: '#B9986A',
    team: 'rock',
    warmup: ['wm-treadmill', 'wm-hip-opener', 'wm-cat-cow'],
    workout: ['lo-squat-bb', 'lo-rdl-bb', 'lo-walking-lunge', 'lo-leg-curl', 'lo-calf-standing', 'fb-ab-wheel'],
    cooldown: ['cd-quad', 'cd-hamstring', 'cd-figure4', 'cd-pigeon'],
  },
  {
    key: 'thu',
    index: 3,
    label: 'Thursday',
    short: 'THU',
    focus: 'Push B',
    tag: 'PUSH · SHOULDERS',
    color: '#C9A268',       // antique gold
    accent: '#E0BE89',
    team: 'electric',
    warmup: ['wm-bike-assault', 'wm-shoulder-cars', 'wm-band-pull-apart', 'wm-bar-warmup'],
    workout: ['push-ohp-db', 'push-incline-db', 'push-cable-fly', 'push-lateral-db', 'wild-dip', 'push-tri-overhead'],
    cooldown: ['cd-doorway-pec', 'cd-shoulder-cross', 'cd-child-pose'],
  },
  {
    key: 'fri',
    index: 4,
    label: 'Friday',
    short: 'FRI',
    focus: 'Pull B',
    tag: 'PULL · THICKNESS',
    color: '#A04E35',       // deep terracotta
    accent: '#C57661',
    team: 'dragon',
    warmup: ['wm-row-erg', 'wm-band-pull-apart', 'wm-scap-pullup'],
    workout: ['pull-row-bb', 'wild-pullup', 'pull-rear-fly', 'pull-curl-hammer', 'pull-curl-ez', 'fb-cable-crunch'],
    cooldown: ['cd-lat-doorway', 'cd-thread-needle', 'cd-child-pose'],
  },
  {
    key: 'sat',
    index: 5,
    label: 'Saturday',
    short: 'SAT',
    focus: 'Legs B',
    tag: 'LEGS · GLUTES',
    color: '#9A6B87',       // plum
    accent: '#BA93A9',
    team: 'aura',
    warmup: ['wm-stairmaster', 'wm-hip-opener', 'wm-cat-cow'],
    workout: ['glu-hip-thrust', 'glu-bulgarian', 'glu-sldl', 'glu-kickback', 'glu-calf-seated', 'fb-plank'],
    cooldown: ['cd-figure4', 'cd-pigeon', 'cd-quad', 'cd-hamstring'],
  },
  {
    key: 'sun',
    index: 6,
    label: 'Sunday',
    short: 'SUN',
    focus: 'Rest — Pokémon Center',
    tag: 'RECOVERY',
    color: '#B39585',       // rose quartz
    accent: '#C9B3A7',
    team: 'rest',
    rest: true,
    restTips: [
      '20–30 min light walk or gentle yoga',
      'Foam rolling — 5 min per problem area',
      'Full-body static stretching routine',
      'Stay hydrated — 3+ liters',
      '7–8 hours sleep tonight',
      'Meal prep for the week ahead',
    ],
    stats: [
      { label: 'Height',        value: "5'8\"" },
      { label: 'Timeline',      value: '10–14 weeks' },
      { label: 'Daily Calories',value: '1,800–2,000' },
      { label: 'Daily Protein', value: '120–135 g' },
    ],
  },
];

export function dayByKey(key) {
  return DAYS.find(d => d.key === key);
}

export function dayByIndex(i) {
  return DAYS[((i % 7) + 7) % 7];
}

// Section iteration helper.
export function sectionsOf(day) {
  if (day.rest) return [];
  return [
    { key: 'warmup',   label: 'Warm-Up',  ids: day.warmup   },
    { key: 'workout',  label: 'Workout',  ids: day.workout  },
    { key: 'cooldown', label: 'Cool-Down',ids: day.cooldown },
  ];
}
