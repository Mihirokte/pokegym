# PokéGym

A Pokémon-themed gym tracker PWA. Train consistently → evolve your team → earn gym badges. Data lives in **your** Google Sheet — no server, no subscription, no lock-in.

<p align="center">
  <img src="assets/icons/icon-192.png" width="96" alt="PokéGym icon" />
</p>

## What it is

- **Push / Pull / Legs split (PPL x2)** — Push A · Pull A · Legs A · Push B · Pull B · Legs B, with a Sunday rest day. Each day umbrella-covers its movement pattern with one compound per muscle plus complementary accessories — no within-day overlap
- **Set-by-set logging** — weight + reps per set, rest timer with vibration
- **Your team evolves** — each day of the week has its own Pokémon (Machop, Tyrogue, Rhyhorn, Elekid, Dratini, Riolu, Chansey). Hit your sections to earn XP, level up, and evolve
- **Gym badges** — 6 workouts in a week = next Kanto badge. 8 badges → Elite Four → Champion
- **Pokéball RNG** — tap the ball mid-session, catch a random wild exercise (50+ in the pool). Classic 1/256 shiny odds (128 with streak bonus)
- **Offline-first PWA** — installable on iOS and Android. Service worker caches shell + sprites. Writes queue when offline, sync on reconnect
- **Extensible library** — add your own exercises in the app; they persist to your Sheet and show up in dropdowns

## Tech

- **Vanilla HTML/CSS/ES modules** — no build, no bundler, no framework. GitHub Pages serves the folder verbatim.
- **Google Sheets API v4** — read/write via direct REST calls (OAuth 2.0 implicit flow, same pattern as [pokecity](https://github.com/Mihirokte/pokecity))
- **localStorage mirror + offline write queue** — everything is optimistic; retries with exponential backoff on 429/5xx
- **Pokésprite** Gen-8 box icons (NDS-style), shipped in-repo for offline use

## Setup — one-time (~10 minutes)

See [SETUP.md](./SETUP.md) for the full walkthrough with screenshots.

TL;DR:

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials). Create a project if you don't have one.
2. Enable **Google Sheets API** and **Google Drive API** in the library.
3. Create an **OAuth 2.0 Client ID** (Web application). Add to:
   - **Authorized JavaScript origins**: `https://<user>.github.io` (and `http://localhost:8080` for local testing)
   - **Authorized redirect URIs**: `https://<user>.github.io/pokegym/` (and `http://localhost:8080/pokegym/`)
4. Copy the client ID.
5. Open the app → paste the client ID → sign in with Google.
6. A spreadsheet called **"PokeGym Data"** is created in your Drive on first login. All your sessions flow into it.

Your Google OAuth client can be the same one you use for pokecity — just add the extra origins/redirects.

## Local dev

```bash
# Anything that serves static files over HTTP (needed so service worker can register)
npx serve pokegym -p 8080
# or
python -m http.server 8080 --directory pokegym
```

Then open http://localhost:8080. For OAuth to work locally, add `http://localhost:8080` to your OAuth client's authorized origins.

## Data model

Your data lives in **one spreadsheet** with these tabs:

| Tab | What it holds |
|---|---|
| `01_Sessions` | One row per finished workout day (date, focus, %, duration) |
| `02_SetLog` | One row per logged set (weight, reps, rpe, exercise) |
| `03_PokeballCatches` | Every wild exercise the Pokéball rolled — caught or fled |
| `04_Badges` | Earned gym-leader badges with the week they were earned |
| `05_TeamState` | Current Pokémon per day, its level, XP, and stage |
| `06_CustomExercises` | Exercises you added through the in-app form |
| `07_Meta` | Key/value for misc settings |

Schema is defined in [`assets/js/config.js`](./assets/js/config.js). Columns are stable — adding columns is safe, reordering is not without a migration.

## Adding exercises

Two ways:

- **In the app** — Library tab → + Add exercise → it writes to `06_CustomExercises` and instantly appears in searches and (if marked `wild`) the Pokéball pool.
- **In code** — edit [`assets/js/data/exercises.js`](./assets/js/data/exercises.js) to add permanent ones. Keep the `id` stable; it's the foreign key in `SetLog`.

## Customizing the split

Edit [`assets/js/data/days.js`](./assets/js/data/days.js). Each day entry lists exercise IDs per section — reorder, remove, or add to taste. Pick a `team` key if you change the Pokémon line assignment.

## Deploy

Automatic via GitHub Pages — push to `main`, `.github/workflows/deploy.yml` uploads the folder. First-time: repo **Settings → Pages → Source: GitHub Actions**.

```bash
gh repo create pokegym --public --source=. --push
# Then in the GitHub UI: Settings → Pages → Build and deployment: GitHub Actions
```

## File layout

```
pokegym/
├── index.html
├── manifest.webmanifest
├── sw.js                        # service worker
├── assets/
│   ├── css/app.css
│   ├── js/
│   │   ├── app.js               # orchestrator + routing
│   │   ├── auth.js              # Google OAuth implicit flow
│   │   ├── config.js            # schema + constants
│   │   ├── sheets.js            # Sheets API v4 wrapper (retry + backoff)
│   │   ├── storage.js           # localStorage mirror + settings
│   │   ├── sync.js              # write queue, flush, bootstrap
│   │   ├── util.js              # helpers (ids, dom, retry, random…)
│   │   ├── data/
│   │   │   ├── days.js          # PPL split (push/pull/legs x2 + rest)
│   │   │   ├── exercises.js     # master exercise library
│   │   │   ├── leaders.js       # gym leaders + Elite Four + Champion
│   │   │   └── pokemon.js       # team mons per day, evolution lines
│   │   └── ui/
│   │       ├── session.js       # today's workout view with inline team/XP
│   │       ├── pokeball.js      # random-exercise modal
│   │       ├── badges.js        # badge progression + recent catches strip
│   │       ├── library.js       # all-exercises browser + add form
│   │       ├── setup.js         # first-run OAuth setup + demo toggle
│   │       ├── timer.js         # rest timer with vibration
│   │       ├── wake.js          # screen wake lock
│   │       └── toast.js
│   ├── sprites/
│   │   ├── pokemon/             # pokesprite gen-8 regular (1332 files)
│   │   ├── pokemon/shiny/       # shiny variants
│   │   └── items/               # pokéball variants
│   ├── icons/                   # PWA icons
│   └── fonts/                   # Dogica pixel font
└── .github/workflows/deploy.yml
```

## Credits

- **Pokésprite** icons: [msikma/pokesprite](https://github.com/msikma/pokesprite) — Pokémon box-icon sprites (MIT for the collection; individual sprites © Nintendo / Game Freak / The Pokémon Company, used here for non-commercial fan purposes)
- **Inter** (Rasmus Andersson, OFL), **Press Start 2P** (CodeMan38, OFL), **JetBrains Mono** (JetBrains, OFL) — all self-hosted from Fontsource
- **Sheets integration pattern** adapted from [pokecity](https://github.com/Mihirokte/pokecity)

Pokémon, Pokémon character names, and Pokéball are trademarks of Nintendo / Game Freak / The Pokémon Company. This is an unofficial fan project. Not affiliated with or endorsed by any of the above.

## License

MIT — see [LICENSE](./LICENSE).
