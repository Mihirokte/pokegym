// Badge progression — earn the next badge when you clock 6 workouts in a
// calendar week (Mon-Sun). Order follows Pokémon Red/Blue/Yellow canon.

export const LEADERS = [
  { index: 0,  key: 'boulder',  name: 'Brock',      city: 'Pewter',       badge: 'Boulder Badge',   type: 'rock',     signature: 'onix'      , color: '#A0A090' },
  { index: 1,  key: 'cascade',  name: 'Misty',      city: 'Cerulean',     badge: 'Cascade Badge',   type: 'water',    signature: 'starmie'   , color: '#6890F0' },
  { index: 2,  key: 'thunder',  name: 'Lt. Surge',  city: 'Vermilion',    badge: 'Thunder Badge',   type: 'electric', signature: 'raichu'    , color: '#F8D030' },
  { index: 3,  key: 'rainbow',  name: 'Erika',      city: 'Celadon',      badge: 'Rainbow Badge',   type: 'grass',    signature: 'vileplume' , color: '#78C850' },
  { index: 4,  key: 'soul',     name: 'Koga',       city: 'Fuchsia',      badge: 'Soul Badge',      type: 'poison',   signature: 'weezing'   , color: '#A040A0' },
  { index: 5,  key: 'marsh',    name: 'Sabrina',    city: 'Saffron',      badge: 'Marsh Badge',     type: 'psychic',  signature: 'alakazam'  , color: '#F85888' },
  { index: 6,  key: 'volcano',  name: 'Blaine',     city: 'Cinnabar',     badge: 'Volcano Badge',   type: 'fire',     signature: 'arcanine'  , color: '#F08030' },
  { index: 7,  key: 'earth',    name: 'Giovanni',   city: 'Viridian',     badge: 'Earth Badge',     type: 'ground',   signature: 'nidoking'  , color: '#E0C068' },
];

// Elite Four — badges 8..11. Defeating all four + Champion completes the run.
export const ELITE_FOUR = [
  { index: 8,  key: 'ef-lorelei', name: 'Lorelei',  badge: 'Icicle Crown',  type: 'ice',     signature: 'lapras'    , color: '#98D8D8' },
  { index: 9,  key: 'ef-bruno',   name: 'Bruno',    badge: 'Fist Crown',    type: 'fighting',signature: 'hitmonlee' , color: '#C03028' },
  { index: 10, key: 'ef-agatha',  name: 'Agatha',   badge: 'Spirit Crown',  type: 'ghost',   signature: 'gengar'    , color: '#705898' },
  { index: 11, key: 'ef-lance',   name: 'Lance',    badge: 'Dragon Crown',  type: 'dragon',  signature: 'dragonite' , color: '#7038F8' },
];

export const CHAMPION = {
  index: 12, key: 'champ-blue',  name: 'Blue',     badge: 'Champion Crown', type: 'mixed',   signature: 'blastoise' , color: '#FFD700',
};

export const ALL_BADGES = [...LEADERS, ...ELITE_FOUR, CHAMPION];

// Each badge requires this many completed workouts.
export const WORKOUTS_PER_BADGE = 6;
export const BADGE_WINDOW_DAYS = 7; // trailing window

export function badgeByIndex(i) {
  return ALL_BADGES[i] || null;
}
