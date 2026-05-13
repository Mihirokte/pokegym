// 6-day recomposition split. Each day has a signature Pokémon line that
// evolves as you hit workouts. Colors drive the section highlighting.

export const DAYS = [
  {
    key: 'mon',
    index: 0,
    label: 'Monday',
    short: 'MON',
    focus: 'Upper Push',
    tag: 'STRENGTH',
    color: '#B85C3D',       // burnt sienna
    accent: '#D89073',
    team: 'fighter',
    warmup: ['wm-bike-assault', 'wm-band-pull-apart', 'wm-shoulder-cars', 'wm-bar-warmup'],
    workout: ['push-bench-bb', 'push-incline-db', 'push-ohp-db', 'push-cable-fly', 'push-lateral-db', 'push-tri-pushdown', 'push-tri-overhead'],
    cooldown: ['cd-doorway-pec', 'cd-shoulder-cross', 'cd-child-pose'],
  },
  {
    key: 'tue',
    index: 1,
    label: 'Tuesday',
    short: 'TUE',
    focus: 'Lower + HIIT',
    tag: 'STRENGTH · HIIT',
    color: '#8B6F47',       // bronze
    accent: '#B9986A',
    team: 'rock',
    warmup: ['wm-treadmill', 'wm-hip-opener', 'wm-cat-cow'],
    workout: ['lo-squat-bb', 'lo-rdl-bb', 'lo-leg-press', 'lo-walking-lunge', 'lo-leg-curl', 'lo-calf-standing', 'lo-hiit-bike'],
    cooldown: ['cd-quad', 'cd-hamstring', 'cd-figure4', 'cd-pigeon'],
  },
  {
    key: 'wed',
    index: 2,
    label: 'Wednesday',
    short: 'WED',
    focus: 'Conditioning',
    tag: 'CARDIO',
    color: '#C9A268',       // antique gold
    accent: '#E0BE89',
    team: 'electric',
    warmup: ['wm-row-erg', 'wm-hip-opener', 'wm-shoulder-cars'],
    workout: ['cond-thruster', 'cond-kb-swing', 'cond-box-jump', 'cond-battle-rope', 'cond-sled-push', 'cond-row-interval'],
    cooldown: ['cd-breath', 'cd-supine-twist', 'cd-child-pose'],
  },
  {
    key: 'thu',
    index: 3,
    label: 'Thursday',
    short: 'THU',
    focus: 'Upper Pull',
    tag: 'STRENGTH',
    color: '#6B8E6B',       // sage
    accent: '#94B294',
    team: 'grappler',
    warmup: ['wm-row-erg', 'wm-band-pull-apart', 'wm-scap-pullup'],
    workout: ['pull-latpull', 'pull-row-bb', 'pull-row-cable', 'pull-face-pull', 'pull-curl-ez', 'pull-curl-hammer', 'pull-rear-fly'],
    cooldown: ['cd-lat-doorway', 'cd-thread-needle', 'cd-child-pose'],
  },
  {
    key: 'fri',
    index: 4,
    label: 'Friday',
    short: 'FRI',
    focus: 'Glute-Focused Lower',
    tag: 'STRENGTH',
    color: '#9A6B87',       // plum
    accent: '#BA93A9',
    team: 'aura',
    warmup: ['wm-stairmaster', 'wm-hip-opener', 'wm-band-pull-apart'],
    workout: ['glu-hip-thrust', 'glu-bulgarian', 'glu-leg-press-deep', 'glu-kickback', 'glu-sldl', 'glu-wall-sit', 'glu-calf-seated'],
    cooldown: ['cd-figure4', 'cd-pigeon', 'cd-quad', 'cd-hamstring'],
  },
  {
    key: 'sat',
    index: 5,
    label: 'Saturday',
    short: 'SAT',
    focus: 'Full Body + Abs',
    tag: 'HYBRID',
    color: '#A04E35',       // deep terracotta
    accent: '#C57661',
    team: 'dragon',
    warmup: ['wm-row-erg', 'wm-hip-opener', 'wm-shoulder-cars', 'wm-cat-cow'],
    workout: ['fb-clean-press', 'fb-renegade', 'fb-farmer', 'fb-ab-wheel', 'fb-hang-leg', 'fb-cable-crunch', 'fb-plank'],
    cooldown: ['cd-supine-twist', 'cd-child-pose', 'cd-breath'],
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
