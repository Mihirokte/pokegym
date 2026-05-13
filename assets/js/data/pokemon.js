// Team mons — one line per training day. Evolves as you accumulate XP.
// Stage 0 (baby) → Stage 1 at level 10 → Stage 2 at level 25.
//
// `slug` matches the pokesprite filename under assets/sprites/pokemon/.

export const TEAMS = {
  // Monday — Upper Push. Brawler line.
  fighter: {
    name: 'Fighter',
    type: 'fighting',
    line: [
      { slug: 'machop',   name: 'Machop',   stage: 0 },
      { slug: 'machoke',  name: 'Machoke',  stage: 1 },
      { slug: 'machamp',  name: 'Machamp',  stage: 2 },
    ],
    blurb: 'All biceps, no small-talk. Evolves via consistent pressing work.',
  },

  // Tuesday — Lower. Ground-type powerhouse.
  rock: {
    name: 'Ground',
    type: 'ground',
    line: [
      { slug: 'rhyhorn',   name: 'Rhyhorn',   stage: 0 },
      { slug: 'rhydon',    name: 'Rhydon',    stage: 1 },
      { slug: 'rhyperior', name: 'Rhyperior', stage: 2 },
    ],
    blurb: 'Every set of squats moves the earth a little.',
  },

  // Wednesday — Conditioning. Electric-type.
  electric: {
    name: 'Electric',
    type: 'electric',
    line: [
      { slug: 'elekid',      name: 'Elekid',      stage: 0 },
      { slug: 'electabuzz',  name: 'Electabuzz',  stage: 1 },
      { slug: 'electivire',  name: 'Electivire',  stage: 2 },
    ],
    blurb: 'Conditioning turns the lights on. Literally voltage-rated.',
  },

  // Thursday — Upper Pull. Fighting/Boxer line.
  grappler: {
    name: 'Grappler',
    type: 'fighting',
    line: [
      { slug: 'tyrogue',     name: 'Tyrogue',     stage: 0 },
      { slug: 'hitmonchan',  name: 'Hitmonchan',  stage: 1 },
      { slug: 'hitmonchan',  name: 'Hitmonchan+', stage: 2 }, // no stage 2 — rename at 25
    ],
    blurb: 'Tyrogue picks its final form based on how you train. We chose the rower.',
  },

  // Friday — Glutes. Aura line.
  aura: {
    name: 'Aura',
    type: 'steel',
    line: [
      { slug: 'riolu',     name: 'Riolu',     stage: 0 },
      { slug: 'lucario',   name: 'Lucario',   stage: 1 },
      { slug: 'lucario',   name: 'Lucario★',  stage: 2 }, // mega-coded, still Lucario sprite
    ],
    blurb: 'Lucario reads your aura. Skipping glute day is felt across the mat.',
  },

  // Saturday — Full Body. Dragon pseudo-legendary.
  dragon: {
    name: 'Dragon',
    type: 'dragon',
    line: [
      { slug: 'dratini',    name: 'Dratini',    stage: 0 },
      { slug: 'dragonair',  name: 'Dragonair',  stage: 1 },
      { slug: 'dragonite',  name: 'Dragonite',  stage: 2 },
    ],
    blurb: 'The longest-grind line. Saturday sessions get you there.',
  },

  // Sunday — Rest. Healer.
  rest: {
    name: 'Healer',
    type: 'normal',
    line: [
      { slug: 'happiny',  name: 'Happiny',  stage: 0 },
      { slug: 'chansey',  name: 'Chansey',  stage: 1 },
      { slug: 'blissey',  name: 'Blissey',  stage: 2 },
    ],
    blurb: 'Rest is training. Blissey heals your CNS.',
  },
};

// Pokemon type colors used in UI for type chips / gradients.
export const TYPE_COLORS = {
  normal:   '#A8A878',
  fire:     '#F08030',
  water:    '#6890F0',
  electric: '#F8D030',
  grass:    '#78C850',
  ice:      '#98D8D8',
  fighting: '#C03028',
  poison:   '#A040A0',
  ground:   '#E0C068',
  flying:   '#A890F0',
  psychic:  '#F85888',
  bug:      '#A8B820',
  rock:     '#B8A038',
  ghost:    '#705898',
  dragon:   '#7038F8',
  dark:     '#705848',
  steel:    '#B8B8D0',
  fairy:    '#EE99AC',
};

// Initial TeamState for a new user — all babies at level 1.
export function initialTeamState() {
  const out = [];
  for (const [teamKey, team] of Object.entries(TEAMS)) {
    const dayKey = {
      fighter:  'mon',
      rock:     'tue',
      electric: 'wed',
      grappler: 'thu',
      aura:     'fri',
      dragon:   'sat',
      rest:     'sun',
    }[teamKey];
    out.push({
      dayKey,
      pokemonId: team.line[0].slug,
      pokemonName: team.line[0].name,
      stage: 0,
      level: 1,
      xp: 0,
      isShiny: 'false',
      lastWorkoutISO: '',
      updatedAt: new Date().toISOString(),
    });
  }
  return out;
}

export function teamForDay(dayKey) {
  const map = {
    mon: 'fighter', tue: 'rock', wed: 'electric', thu: 'grappler',
    fri: 'aura', sat: 'dragon', sun: 'rest',
  };
  return TEAMS[map[dayKey]];
}

// Resolve current team-member sprite from the state row.
export function teamMemberFromState(row, customMap = {}) {
  const team = teamForDay(row.dayKey);
  if (!team) return null;
  const stage = Math.min(Number(row.stage) || 0, team.line.length - 1);
  return { ...team.line[stage], team, state: row };
}
