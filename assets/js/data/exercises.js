// Master exercise library for PokeGym.
//
// Every exercise has a stable `id` (used as sheet foreign key), a name,
// default scheme, and a form cue. Adding a new exercise: append here OR use
// the in-app "Add Exercise" form which writes to the CustomExercises sheet.
//
// Sources cross-referenced while compiling this list:
//   - Stronger By Science exercise bank (stretched-position bias)
//   - ExRx.net movement database
//   - NSCA Essentials of Personal Training (3rd ed.) cue wording
//   - Jeff Nippard's Pure Hypertrophy / Upper-Lower programs

import { todayISO } from '../util.js';

const E = (id, data) => ({ id, ...data });

// Sections:
//   'warmup' — dynamic, ramp-up, low load
//   'workout' — main lifts / isolation
//   'cooldown' — static stretches, mobility
//
// trackLoad: true means the UI will show weight + reps inputs per set.
// isTime: true means the "reps" field is actually seconds.

export const EXERCISES = Object.fromEntries([

  // ─── Warmup (universal — gym machines and movement prep) ────────────────
  E('wm-row-erg',        { name: 'Rowing Erg',             section: 'warmup', muscle: 'full body',  equipment: 'machine',    type: 'cardio',     defaultSets: 1, defaultReps: '5 min', isTime: true, trackLoad: false, cue: 'Drive legs → hinge → pull. 2:00/500m pace.', wild: false }),
  E('wm-bike-assault',   { name: 'Assault Bike',           section: 'warmup', muscle: 'full body',  equipment: 'machine',    type: 'cardio',     defaultSets: 1, defaultReps: '3 min', isTime: true, trackLoad: false, cue: 'Drive arms and legs together. Conversational pace.', wild: false }),
  E('wm-treadmill',      { name: 'Treadmill Incline Walk', section: 'warmup', muscle: 'legs',       equipment: 'machine',    type: 'cardio',     defaultSets: 1, defaultReps: '5 min', isTime: true, trackLoad: false, cue: '4% incline, 5.5 km/h. Nasal breathing.', wild: false }),
  E('wm-stairmaster',    { name: 'StairMaster',            section: 'warmup', muscle: 'legs',       equipment: 'machine',    type: 'cardio',     defaultSets: 1, defaultReps: '3 min', isTime: true, trackLoad: false, cue: 'Chest up. Don\'t lean on the rails.', wild: false }),
  E('wm-band-pull-apart',{ name: 'Band Pull-Apart',        section: 'warmup', muscle: 'rear delt',  equipment: 'band',       type: 'mobility',   defaultSets: 2, defaultReps: '20',     isTime: false, trackLoad: false, cue: 'Squeeze shoulder blades, arms stay straight.', wild: false }),
  E('wm-cat-cow',        { name: 'Cat-Cow',                section: 'warmup', muscle: 'spine',      equipment: 'bodyweight', type: 'mobility',   defaultSets: 2, defaultReps: '10',     isTime: false, trackLoad: false, cue: 'Move one vertebra at a time. Breathe with motion.', wild: false }),
  E('wm-hip-opener',     { name: '90/90 Hip Switch',       section: 'warmup', muscle: 'hips',       equipment: 'bodyweight', type: 'mobility',   defaultSets: 2, defaultReps: '8 ea.',  isTime: false, trackLoad: false, cue: 'Flat back. Rotate from the hip, not the spine.', wild: false }),
  E('wm-shoulder-cars',  { name: 'Shoulder CARs',          section: 'warmup', muscle: 'shoulder',   equipment: 'bodyweight', type: 'mobility',   defaultSets: 2, defaultReps: '6 ea.',  isTime: false, trackLoad: false, cue: 'Slow controlled circles. No shrug at the top.', wild: false }),
  E('wm-scap-pullup',    { name: 'Scapular Pull-Up',       section: 'warmup', muscle: 'scap',       equipment: 'bar',        type: 'mobility',   defaultSets: 2, defaultReps: '10',     isTime: false, trackLoad: false, cue: 'Arms stay straight. Pull shoulder blades down.', wild: false }),
  E('wm-bar-warmup',     { name: 'Empty Bar Set',          section: 'warmup', muscle: 'full body',  equipment: 'barbell',    type: 'strength',   defaultSets: 2, defaultReps: '10',     isTime: false, trackLoad: false, cue: 'Rehearse movement pattern. No ego.', wild: false }),

  // ─── Monday — Upper Push ────────────────────────────────────────────────
  E('push-bench-bb',     { name: 'Barbell Bench Press',    section: 'workout', muscle: 'chest',      equipment: 'barbell',    type: 'strength',   defaultSets: 3, defaultReps: '8-10',  isTime: false, trackLoad: true,  cue: 'Tuck elbows ~60°. Bar to lower chest. Leg drive.', wild: false }),
  E('push-incline-db',   { name: 'Incline Dumbbell Press', section: 'workout', muscle: 'upper chest',equipment: 'dumbbell',   type: 'strength',   defaultSets: 3, defaultReps: '10-12', isTime: false, trackLoad: true,  cue: '30° bench. Elbows under wrists. Full stretch.', wild: false }),
  E('push-ohp-db',       { name: 'Seated DB Shoulder Press',section: 'workout',muscle: 'shoulder',  equipment: 'dumbbell',   type: 'strength',   defaultSets: 3, defaultReps: '10-12', isTime: false, trackLoad: true,  cue: 'Press, don\'t punch. Ribs down, glutes tight.', wild: false }),
  E('push-cable-fly',    { name: 'Cable Chest Fly',        section: 'workout', muscle: 'chest',      equipment: 'cable',      type: 'strength',   defaultSets: 3, defaultReps: '12-15', isTime: false, trackLoad: true,  cue: 'Slight elbow bend, squeeze at midline 1s.', wild: false }),
  E('push-lateral-db',   { name: 'Dumbbell Lateral Raise', section: 'workout', muscle: 'side delt',  equipment: 'dumbbell',   type: 'strength',   defaultSets: 3, defaultReps: '12-15', isTime: false, trackLoad: true,  cue: 'Lead with elbow. Stop at shoulder height.',   wild: true, pokemon: 'hitmonchan' }),
  E('push-tri-pushdown', { name: 'Cable Tricep Pushdown',  section: 'workout', muscle: 'triceps',    equipment: 'cable',      type: 'strength',   defaultSets: 3, defaultReps: '12-15', isTime: false, trackLoad: true,  cue: 'Elbows pinned. Lock out fully, no hip drive.', wild: false }),
  E('push-tri-overhead', { name: 'Overhead Tricep Ext',    section: 'workout', muscle: 'triceps',    equipment: 'cable',      type: 'strength',   defaultSets: 3, defaultReps: '10-12', isTime: false, trackLoad: true,  cue: 'Elbows stay narrow. Feel the long head stretch.',wild: false }),

  // ─── Tuesday — Lower ────────────────────────────────────────────────────
  E('lo-squat-bb',       { name: 'Barbell Back Squat',     section: 'workout', muscle: 'quads',      equipment: 'barbell',    type: 'strength',   defaultSets: 3, defaultReps: '6-8',   isTime: false, trackLoad: true,  cue: 'Break at hips and knees together. Chest proud.',wild: false }),
  E('lo-rdl-bb',         { name: 'Romanian Deadlift',      section: 'workout', muscle: 'hamstrings', equipment: 'barbell',    type: 'strength',   defaultSets: 3, defaultReps: '8-10',  isTime: false, trackLoad: true,  cue: 'Hinge at hips, bar scrapes thighs. Flat back.',  wild: false }),
  E('lo-leg-press',      { name: 'Leg Press',              section: 'workout', muscle: 'quads',      equipment: 'machine',    type: 'strength',   defaultSets: 3, defaultReps: '10-12', isTime: false, trackLoad: true,  cue: 'Feet mid-platform. Don\'t round your low back.', wild: false }),
  E('lo-walking-lunge',  { name: 'Walking DB Lunge',       section: 'workout', muscle: 'quads',      equipment: 'dumbbell',   type: 'strength',   defaultSets: 3, defaultReps: '12 ea.', isTime: false, trackLoad: true,  cue: 'Long stride, vertical torso. Drive off front heel.',wild: true, pokemon: 'doduo' }),
  E('lo-leg-curl',       { name: 'Lying Leg Curl',         section: 'workout', muscle: 'hamstrings', equipment: 'machine',    type: 'strength',   defaultSets: 3, defaultReps: '12-15', isTime: false, trackLoad: true,  cue: 'Curl heels to glutes, hips stay down.',          wild: false }),
  E('lo-calf-standing',  { name: 'Standing Calf Raise',    section: 'workout', muscle: 'calves',     equipment: 'machine',    type: 'strength',   defaultSets: 3, defaultReps: '12-15', isTime: false, trackLoad: true,  cue: 'Full stretch at bottom, pause 1s at top.',       wild: false }),
  E('lo-hiit-bike',      { name: 'HIIT — Assault Bike',    section: 'workout', muscle: 'full body',  equipment: 'machine',    type: 'cardio',     defaultSets: 5, defaultReps: '30s',    isTime: true,  trackLoad: false, cue: '30s all-out / 30s easy. Don\'t slow on the rest.',wild: true, pokemon: 'electabuzz' }),

  // ─── Wednesday — Conditioning Circuit ───────────────────────────────────
  E('cond-thruster',     { name: 'Dumbbell Thruster',      section: 'workout', muscle: 'full body',  equipment: 'dumbbell',   type: 'strength',   defaultSets: 3, defaultReps: '10',     isTime: false, trackLoad: true,  cue: 'Squat → drive → press in one motion.',          wild: false }),
  E('cond-kb-swing',     { name: 'Kettlebell Swing',       section: 'workout', muscle: 'posterior',  equipment: 'kettlebell', type: 'strength',   defaultSets: 3, defaultReps: '15',     isTime: false, trackLoad: true,  cue: 'Hip snap — not a squat. Float the bell.',       wild: true, pokemon: 'cubone' }),
  E('cond-box-jump',     { name: 'Box Jump',               section: 'workout', muscle: 'quads',      equipment: 'box',        type: 'strength',   defaultSets: 3, defaultReps: '10',     isTime: false, trackLoad: false, cue: 'Land soft and athletic. Step down — never jump.',wild: true, pokemon: 'scyther' }),
  E('cond-battle-rope',  { name: 'Battle Ropes',           section: 'workout', muscle: 'shoulder',   equipment: 'ropes',      type: 'cardio',     defaultSets: 3, defaultReps: '30s',    isTime: true,  trackLoad: false, cue: 'Stay athletic. Alternate waves, then slams.',    wild: true, pokemon: 'seviper' }),
  E('cond-sled-push',    { name: 'Sled Push',              section: 'workout', muscle: 'quads',      equipment: 'sled',       type: 'strength',   defaultSets: 3, defaultReps: '40m',    isTime: false, trackLoad: true,  cue: 'Low body angle. Drive through mid-foot.',        wild: true, pokemon: 'tauros' }),
  E('cond-row-interval', { name: 'Row — 500m',             section: 'workout', muscle: 'full body',  equipment: 'machine',    type: 'cardio',     defaultSets: 3, defaultReps: '500m',   isTime: false, trackLoad: false, cue: 'Legs → hips → arms. Same pace each 500m.',      wild: false }),
  E('cond-treadmill',    { name: 'Treadmill Intervals',    section: 'workout', muscle: 'full body',  equipment: 'machine',    type: 'cardio',     defaultSets: 6, defaultReps: '90s',    isTime: true,  trackLoad: false, cue: '90s @ 9–10 km/h on 4% incline · 60s walk between.',   wild: true, pokemon: 'doduo' }),
  E('cond-elliptical',   { name: 'Cross-Trainer Intervals',section: 'workout', muscle: 'full body',  equipment: 'machine',    type: 'cardio',     defaultSets: 5, defaultReps: '60s',    isTime: true,  trackLoad: false, cue: '60s push pace · 60s easy. Drive elbows back hard.',   wild: false }),

  // ─── Thursday — Upper Pull ──────────────────────────────────────────────
  E('pull-latpull',      { name: 'Lat Pulldown',           section: 'workout', muscle: 'back',       equipment: 'cable',      type: 'strength',   defaultSets: 3, defaultReps: '10-12', isTime: false, trackLoad: true,  cue: 'Elbows drive down-and-back. Chest to bar.',     wild: false }),
  E('pull-row-bb',       { name: 'Barbell Row',            section: 'workout', muscle: 'back',       equipment: 'barbell',    type: 'strength',   defaultSets: 3, defaultReps: '8-10',  isTime: false, trackLoad: true,  cue: 'Hinge to 45°. Pull to belly, not chest.',        wild: false }),
  E('pull-row-cable',    { name: 'Seated Cable Row',       section: 'workout', muscle: 'back',       equipment: 'cable',      type: 'strength',   defaultSets: 3, defaultReps: '10-12', isTime: false, trackLoad: true,  cue: 'Protract, retract. Pause at contraction.',       wild: false }),
  E('pull-face-pull',    { name: 'Cable Face Pull',        section: 'workout', muscle: 'rear delt',  equipment: 'cable',      type: 'strength',   defaultSets: 3, defaultReps: '15',     isTime: false, trackLoad: true,  cue: 'Rope to eyebrows. External rotate at the end.',  wild: false }),
  E('pull-curl-ez',      { name: 'EZ-Bar Curl',            section: 'workout', muscle: 'biceps',     equipment: 'ez bar',     type: 'strength',   defaultSets: 3, defaultReps: '10-12', isTime: false, trackLoad: true,  cue: 'Elbows still. Squeeze hard at the top.',         wild: false }),
  E('pull-curl-hammer',  { name: 'DB Hammer Curl',         section: 'workout', muscle: 'biceps',     equipment: 'dumbbell',   type: 'strength',   defaultSets: 3, defaultReps: '12',     isTime: false, trackLoad: true,  cue: 'Neutral grip. Controlled eccentric 2s.',         wild: false }),
  E('pull-rear-fly',     { name: 'Rear Delt Fly',          section: 'workout', muscle: 'rear delt',  equipment: 'dumbbell',   type: 'strength',   defaultSets: 3, defaultReps: '15',     isTime: false, trackLoad: true,  cue: 'Chest supported. Thumbs slightly down.',         wild: false }),

  // ─── Friday — Glute-Focused Lower ───────────────────────────────────────
  E('glu-hip-thrust',    { name: 'Barbell Hip Thrust',     section: 'workout', muscle: 'glutes',     equipment: 'barbell',    type: 'strength',   defaultSets: 3, defaultReps: '8-10',  isTime: false, trackLoad: true,  cue: 'Ribs down. Lock out glutes at top. Pause 1s.',   wild: false }),
  E('glu-bulgarian',     { name: 'Bulgarian Split Squat',  section: 'workout', muscle: 'quads/glutes',equipment: 'dumbbell',  type: 'strength',   defaultSets: 3, defaultReps: '10 ea.', isTime: false, trackLoad: true,  cue: 'Torso leans forward slightly. Drive through heel.',wild: true, pokemon: 'machoke' }),
  E('glu-leg-press-deep',{ name: 'Deep Leg Press',         section: 'workout', muscle: 'glutes',     equipment: 'machine',    type: 'strength',   defaultSets: 3, defaultReps: '12',     isTime: false, trackLoad: true,  cue: 'Feet high on platform. Go as deep as back allows.',wild: false }),
  E('glu-kickback',      { name: 'Cable Glute Kickback',   section: 'workout', muscle: 'glutes',     equipment: 'cable',      type: 'strength',   defaultSets: 3, defaultReps: '15 ea.', isTime: false, trackLoad: true,  cue: 'Neutral spine. Kick back, not up.',              wild: false }),
  E('glu-sldl',          { name: 'Single-Leg RDL',         section: 'workout', muscle: 'hamstrings', equipment: 'dumbbell',   type: 'strength',   defaultSets: 3, defaultReps: '10 ea.', isTime: false, trackLoad: true,  cue: 'Hips square to floor. Slow eccentric 3s.',      wild: false }),
  E('glu-wall-sit',      { name: 'Wall Sit',               section: 'workout', muscle: 'quads',      equipment: 'wall',       type: 'isometric',  defaultSets: 3, defaultReps: '45s',    isTime: true,  trackLoad: false, cue: '90° knees. Back flat against wall. Breathe.',  wild: true, pokemon: 'geodude' }),
  E('glu-calf-seated',   { name: 'Seated Calf Raise',      section: 'workout', muscle: 'calves',     equipment: 'machine',    type: 'strength',   defaultSets: 3, defaultReps: '15',     isTime: false, trackLoad: true,  cue: 'Full range. Pause 1s stretched, 1s squeezed.',   wild: false }),

  // ─── Saturday — Full Body + Abs ─────────────────────────────────────────
  E('fb-clean-press',    { name: 'DB Clean and Press',     section: 'workout', muscle: 'full body',  equipment: 'dumbbell',   type: 'strength',   defaultSets: 3, defaultReps: '8',      isTime: false, trackLoad: true,  cue: 'One fluid motion — floor to overhead.',          wild: false }),
  E('fb-renegade',       { name: 'Renegade Row',           section: 'workout', muscle: 'back/core',  equipment: 'dumbbell',   type: 'strength',   defaultSets: 3, defaultReps: '10 ea.', isTime: false, trackLoad: true,  cue: 'Hips don\'t twist. Lock plank first, row second.',wild: false }),
  E('fb-farmer',         { name: 'Farmer\'s Walk',         section: 'workout', muscle: 'grip/core',  equipment: 'dumbbell',   type: 'strength',   defaultSets: 3, defaultReps: '40s',    isTime: true,  trackLoad: true,  cue: 'Tall spine. Short fast steps. Don\'t swing.',    wild: true, pokemon: 'machamp' }),
  E('fb-ab-wheel',       { name: 'Ab Wheel Rollout',       section: 'workout', muscle: 'core',       equipment: 'wheel',      type: 'strength',   defaultSets: 3, defaultReps: '10',     isTime: false, trackLoad: false, cue: 'Tuck pelvis. Ribs down. No lumbar sag.',         wild: false }),
  E('fb-hang-leg',       { name: 'Hanging Leg Raise',      section: 'workout', muscle: 'core',       equipment: 'bar',        type: 'strength',   defaultSets: 3, defaultReps: '12',     isTime: false, trackLoad: false, cue: 'Posterior tilt first. Avoid swinging.',          wild: false }),
  E('fb-cable-crunch',   { name: 'Cable Crunch',           section: 'workout', muscle: 'core',       equipment: 'cable',      type: 'strength',   defaultSets: 3, defaultReps: '15',     isTime: false, trackLoad: true,  cue: 'Round the upper back. Hip-hinge is cheating.',   wild: false }),
  E('fb-plank',          { name: 'Plank Hold',             section: 'workout', muscle: 'core',       equipment: 'bodyweight', type: 'isometric',  defaultSets: 3, defaultReps: '45s',    isTime: true,  trackLoad: false, cue: 'Long line from heels to crown. Squeeze glutes.', wild: true, pokemon: 'snorlax' }),

  // ─── Wild-pool extras (Pokeball RNG) ────────────────────────────────────
  // These aren't in any day's default routine but get pulled by the Pokeball.
  E('wild-burpee',       { name: 'Burpee',                 section: 'workout', muscle: 'full body',  equipment: 'bodyweight', type: 'cardio',     defaultSets: 3, defaultReps: '10',     isTime: false, trackLoad: false, cue: 'Full plank. Chest to floor. Vertical jump.',    wild: true, pokemon: 'primeape' }),
  E('wild-mountain',     { name: 'Mountain Climber',       section: 'workout', muscle: 'core',       equipment: 'bodyweight', type: 'cardio',     defaultSets: 3, defaultReps: '30s',    isTime: true,  trackLoad: false, cue: 'Shoulders over wrists. Hot feet.',              wild: true, pokemon: 'aipom' }),
  E('wild-russian',      { name: 'Russian Twist',          section: 'workout', muscle: 'obliques',   equipment: 'dumbbell',   type: 'strength',   defaultSets: 3, defaultReps: '20',     isTime: false, trackLoad: true,  cue: 'Feet optional up. Rotate torso, not just arms.',wild: true, pokemon: 'ekans' }),
  E('wild-jump-rope',    { name: 'Jump Rope',              section: 'workout', muscle: 'calves',     equipment: 'rope',       type: 'cardio',     defaultSets: 3, defaultReps: '60s',    isTime: true,  trackLoad: false, cue: 'Wrists, not shoulders. Quiet landings.',        wild: true, pokemon: 'pikachu' }),
  E('wild-pullup',       { name: 'Pull-Up',                section: 'workout', muscle: 'back',       equipment: 'bar',        type: 'strength',   defaultSets: 3, defaultReps: 'AMRAP',  isTime: false, trackLoad: false, cue: 'Full hang, chin over bar. No kip.',             wild: true, pokemon: 'aerodactyl' }),
  E('wild-dip',          { name: 'Bar Dip',                section: 'workout', muscle: 'triceps',    equipment: 'bar',        type: 'strength',   defaultSets: 3, defaultReps: '10',     isTime: false, trackLoad: false, cue: 'Slight forward lean. Elbows at 45° tuck.',      wild: true, pokemon: 'hitmonlee' }),
  E('wild-pushup',       { name: 'Push-Up',                section: 'workout', muscle: 'chest',      equipment: 'bodyweight', type: 'strength',   defaultSets: 3, defaultReps: '15',     isTime: false, trackLoad: false, cue: 'Elbows 45°. Full lockout each rep.',            wild: true, pokemon: 'tyrogue' }),
  E('wild-jump-squat',   { name: 'Jump Squat',             section: 'workout', muscle: 'quads',      equipment: 'bodyweight', type: 'cardio',     defaultSets: 3, defaultReps: '12',     isTime: false, trackLoad: false, cue: 'Full squat depth. Land soft, reset each rep.',  wild: true, pokemon: 'spearow' }),
  E('wild-sit-up',       { name: 'Weighted Sit-Up',        section: 'workout', muscle: 'core',       equipment: 'dumbbell',   type: 'strength',   defaultSets: 3, defaultReps: '15',     isTime: false, trackLoad: true,  cue: 'Round up through thoracic. Hold plate on chest.',wild: true, pokemon: 'geodude' }),
  E('wild-kb-goblet',    { name: 'Goblet Squat',           section: 'workout', muscle: 'quads',      equipment: 'kettlebell', type: 'strength',   defaultSets: 3, defaultReps: '12',     isTime: false, trackLoad: true,  cue: 'Elbows inside knees at bottom. Upright torso.', wild: true, pokemon: 'marill' }),
  E('wild-devil-press',  { name: 'Devil Press',            section: 'workout', muscle: 'full body',  equipment: 'dumbbell',   type: 'cardio',     defaultSets: 3, defaultReps: '8',      isTime: false, trackLoad: true,  cue: 'Burpee + snatch. The suck is the point.',       wild: true, pokemon: 'houndour' }),
  E('wild-man-maker',    { name: 'Man Maker',              section: 'workout', muscle: 'full body',  equipment: 'dumbbell',   type: 'cardio',     defaultSets: 3, defaultReps: '6',      isTime: false, trackLoad: true,  cue: 'Row-row-thrust. Reset posture between reps.',   wild: true, pokemon: 'rhyhorn' }),
  E('wild-bear-crawl',   { name: 'Bear Crawl',             section: 'workout', muscle: 'core',       equipment: 'bodyweight', type: 'cardio',     defaultSets: 3, defaultReps: '20m',    isTime: false, trackLoad: false, cue: 'Hips low. Opposite hand/foot.',                 wild: true, pokemon: 'teddiursa' }),
  E('wild-turkish',      { name: 'Turkish Get-Up',         section: 'workout', muscle: 'full body',  equipment: 'kettlebell', type: 'strength',   defaultSets: 2, defaultReps: '5 ea.',  isTime: false, trackLoad: true,  cue: 'Eyes on bell the whole time.',                  wild: true, pokemon: 'alakazam' }),
  E('wild-wall-ball',    { name: 'Wall Ball',              section: 'workout', muscle: 'full body',  equipment: 'medicine ball',type: 'cardio',   defaultSets: 3, defaultReps: '15',     isTime: false, trackLoad: true,  cue: 'Squat to target in one motion.',                wild: true, pokemon: 'voltorb' }),
  E('wild-ring-row',     { name: 'Ring Row',               section: 'workout', muscle: 'back',       equipment: 'rings',      type: 'strength',   defaultSets: 3, defaultReps: '12',     isTime: false, trackLoad: false, cue: 'Body straight. Chest to rings.',                wild: true, pokemon: 'mankey' }),

  // ─── Cooldown (universal) ───────────────────────────────────────────────
  E('cd-child-pose',     { name: 'Child\'s Pose',          section: 'cooldown', muscle: 'lats/spine',equipment: 'bodyweight', type: 'mobility',   defaultSets: 1, defaultReps: '60s',   isTime: true,  trackLoad: false, cue: 'Sit back on heels. Reach arms forward.',         wild: false }),
  E('cd-figure4',        { name: 'Figure-4 Stretch',       section: 'cooldown', muscle: 'glutes',   equipment: 'bodyweight', type: 'mobility',   defaultSets: 1, defaultReps: '45s ea.',isTime: true,  trackLoad: false, cue: 'Lying, ankle on knee. Pull other knee in.',     wild: false }),
  E('cd-pigeon',         { name: 'Pigeon Pose',            section: 'cooldown', muscle: 'hips',     equipment: 'bodyweight', type: 'mobility',   defaultSets: 1, defaultReps: '60s ea.',isTime: true,  trackLoad: false, cue: 'Shin parallel to edge of mat. Hip square.',     wild: false }),
  E('cd-thread-needle',  { name: 'Thread the Needle',      section: 'cooldown', muscle: 'thoracic', equipment: 'bodyweight', type: 'mobility',   defaultSets: 1, defaultReps: '45s ea.',isTime: true,  trackLoad: false, cue: 'Arm under body, shoulder to floor.',             wild: false }),
  E('cd-doorway-pec',    { name: 'Doorway Pec Stretch',    section: 'cooldown', muscle: 'chest',    equipment: 'wall',       type: 'mobility',   defaultSets: 1, defaultReps: '30s ea.',isTime: true,  trackLoad: false, cue: 'Elbow at 90°. Step through slowly.',             wild: false }),
  E('cd-quad',           { name: 'Standing Quad Stretch',  section: 'cooldown', muscle: 'quads',    equipment: 'bodyweight', type: 'mobility',   defaultSets: 1, defaultReps: '30s ea.',isTime: true,  trackLoad: false, cue: 'Knees together. Drive hip forward.',             wild: false }),
  E('cd-hamstring',      { name: 'Standing Hamstring',     section: 'cooldown', muscle: 'hamstrings',equipment:'bodyweight',  type: 'mobility',   defaultSets: 1, defaultReps: '30s ea.',isTime: true,  trackLoad: false, cue: 'Hinge at hips, not the low back.',               wild: false }),
  E('cd-shoulder-cross', { name: 'Cross-Body Shoulder',    section: 'cooldown', muscle: 'shoulder', equipment: 'bodyweight', type: 'mobility',   defaultSets: 1, defaultReps: '30s ea.',isTime: true,  trackLoad: false, cue: 'Arm across chest, pull at elbow.',               wild: false }),
  E('cd-lat-doorway',    { name: 'Lat Doorway Stretch',    section: 'cooldown', muscle: 'lats',     equipment: 'doorway',    type: 'mobility',   defaultSets: 1, defaultReps: '30s ea.',isTime: true,  trackLoad: false, cue: 'Hang back, dip hip away. Side bend gently.',     wild: false }),
  E('cd-supine-twist',   { name: 'Supine Spinal Twist',    section: 'cooldown', muscle: 'spine',    equipment: 'bodyweight', type: 'mobility',   defaultSets: 1, defaultReps: '45s ea.',isTime: true,  trackLoad: false, cue: 'Knee over opposite side, shoulder to floor.',    wild: false }),
  E('cd-breath',         { name: 'Box Breathing',          section: 'cooldown', muscle: 'cns',      equipment: 'bodyweight', type: 'mobility',   defaultSets: 1, defaultReps: '2 min',  isTime: true,  trackLoad: false, cue: '4 in, 4 hold, 4 out, 4 hold.',                   wild: false }),

].map(e => [e.id, e]));

// Sugar — get by id with safe fallback (returns unknown-shape object so the
// UI never crashes on a deleted/renamed id).
export function getExercise(id, customMap = {}) {
  return EXERCISES[id] || customMap[id] || {
    id, name: id, section: 'workout', muscle: '', equipment: '',
    type: 'strength', defaultSets: 3, defaultReps: '10', isTime: false,
    trackLoad: true, cue: '', wild: false,
  };
}

// Flat list for the "Browse all exercises" UI.
export function allExercises(customMap = {}) {
  return [...Object.values(EXERCISES), ...Object.values(customMap)];
}

// Wild encounter pool — everything marked wild.
export function wildPool(customMap = {}) {
  return allExercises(customMap).filter(e => e.wild);
}

// Default object-shape for a brand-new custom exercise added via UI.
export function newCustomExercise(partial = {}) {
  return {
    id: 'custom-' + Math.random().toString(36).slice(2, 10),
    name: 'New Exercise',
    section: 'workout',
    muscle: '',
    equipment: '',
    type: 'strength',
    defaultSets: 3,
    defaultReps: '10',
    isTime: false,
    trackLoad: true,
    cue: '',
    wild: false,
    addedAt: todayISO(),
    ...partial,
  };
}
