# SPL — Every Match. Every Moment. Every Goal.

App name: **SPL** · Domain: **spl.pi** · Category: Live Football Scores & Complete Football Platform · Support: support.spl.pi@gmail.com

Football-only Pi Network PWA on Cloudflare Pages. **Stage 1:** live scores, fixtures & results,
match centre, league tables, top scorers, team pages, search and follows.

## Repo layout

Cloudflare serves the repo's top level (Build output directory: `.`).

```
index.html, sw.js, manifest.webmanifest, icons/   ← the app
privacy.html, terms.html                           ← redirect to the in-app pages
_routes.json      only /api/* and the Pi endpoints run Functions
_headers          security + caching headers
_redirects        hides server/, test/, functions/ source from public view
functions/api/[[path]].js                          every /api/* request
functions/approve.js, complete.js, cancel-payment.js, verify-user.js   Pi mainnet endpoints
server/           data layer + Pi helpers (bundled into Functions, never served)
test/             local mock server (not used in production)
```

The UI only ever sees SPL's own normalised data, so switching provider is an
environment-variable change, not a rebuild.

## Deploy (Cloudflare Pages)

1. Push this folder to a new GitHub repo (e.g. `abdallahelbaggari/spl-pi`).
2. Cloudflare → Workers & Pages → Create → Pages → connect the repo.
   - Framework preset: **None** · Build command: *(leave empty)* · Build output directory: **`.`**
3. Settings → Environment variables (Production) — add as **Secret**:

| Variable | Value |
|---|---|
| `FOOTBALL_DATA_KEY` | your football-data.org token (free plan works) |
| `API_FOOTBALL_KEY` | *(optional)* api-sports.io key — enables Saudi Pro League, NPFL, CAF, line-ups, stats |
| `DATA_PROVIDER` | *(optional)* `football-data` or `api-football` — forces one if both keys are set |
| `FD_PLAN` | *(optional)* `deep` if you buy football-data's Deep Data add-on |

   If no provider is forced, API-Football is used when its key exists, otherwise football-data.org.
4. *(Recommended)* Create a KV namespace `spl-cache` and bind it to the project as **`SPL_CACHE`**
   (Settings → Functions → KV bindings). It keeps tables/teams cached across Cloudflare instances.
5. Redeploy. Check `https://<project>.pages.dev/api/status` → should show `"configured":true`.

## Pi Network — MAINNET (sign-in + payments)

Everything runs on Pi **mainnet** (`sandbox: false` in `index.html`). Do not set it to `true` on this project.

| Endpoint | File | What it does |
|---|---|---|
| `POST /verify-user` | `functions/verify-user.js` | confirms the Pi login with Pi's servers |
| `POST /approve` | `functions/approve.js` | checks it's an SPL payment for 0.5 / 1 / 5 π, then approves |
| `POST /complete` | `functions/complete.js` | completes the payment with the txid |
| `POST /cancel-payment` | `functions/cancel-payment.js` | cancels a stuck payment |

All four always answer HTTP 200 (a non-200 causes "Payment Expired"). Open each URL in a browser —
you should see JSON with `"network":"mainnet","keyConfigured":true`.

Setup:
1. develop.pi → your mainnet app → copy the **API Key** → Cloudflare → Settings → Environment variables →
   add **`PI_API_KEY`** as a Secret (Production) → redeploy.
2. develop.pi → App URL = `https://spl-pi.pages.dev`.
3. Validate domain: in Cloudflare add the variable **`PI_VALIDATION_KEY`** with the key develop.pi shows, redeploy, then click Validate (SPL serves it at `/validation-key.txt`).
4. Test in the Pi Browser: My Football → Sign in with Pi → Support SPL → 1 π.

Logging: every login and payment step writes one line tagged `SPL-PI`
(`login:ok`, `approve:request`, `approve:ok`, `complete:ok`, `cancel:ok`, and `…:failed` / `rejected` with the reason).
View them in Cloudflare → your project → Functions → **Real-time Logs** (begin the log stream, then pay).
The app also shows a step-by-step payment log on screen. The API key is never logged.

Amounts: change in both `CONFIG.PAY_AMOUNTS` (index.html) and `ALLOWED_AMOUNTS` (server/pi.js).

## Testnet (same repo, second Cloudflare project)

The app picks the Pi network from its address: any host containing `testnet`
(e.g. `spl-testnet.pages.dev`) runs Pi **testnet** (sandbox) and shows an amber "Pi Testnet" badge
and stripe. Everything else (`spl-pi.pages.dev`, `spl.pi`) is **mainnet**.

| Cloudflare project | Address | Secrets / variables |
|---|---|---|
| `spl-pi` (mainnet) | spl-pi.pages.dev | `PI_API_KEY` (mainnet app), `PI_VALIDATION_KEY` (mainnet), `FD_API_KEY`, `API_FOOTBALL_KEY`, KV `SPL_CACHE` |
| `spl-testnet` (testnet) | spl-testnet.pages.dev | `PI_API_KEY` (testnet app), `PI_VALIDATION_KEY` (testnet), `PI_NETWORK=testnet`, `FD_API_KEY` |

- Do **not** add `API_FOOTBALL_KEY` to testnet — both projects would share one 100/day allowance.
- `/validation-key.txt` is served from `PI_VALIDATION_KEY`, so each app verifies its own domain.
- Both projects deploy from the same `main` branch; one push updates both.

## Data providers — both completely free, used together

| Variable (Cloudflare Secret) | Source | Covers |
|---|---|---|
| `FOOTBALL_DATA_KEY` | football-data.org free plan (free forever) | PL, UCL, La Liga, Serie A, Bundesliga, Ligue 1, Championship, Eredivisie, Primeira Liga, Brasileirão, World Cup, Euros |
| `API_FOOTBALL_KEY` | API-Football free plan (100 requests/day) | Saudi Pro League + NPFL (change with `AF_LEAGUES`, default `307,399`) |

With both keys set, SPL runs in **hybrid** mode automatically (`server/providers/hybrid.js`).

**Bind KV — required for hybrid.** Cloudflare → Workers & Pages → KV → create namespace `spl-cache`, then
project → Settings → Bindings → add KV binding named **`SPL_CACHE`**. It lets every Cloudflare server share
one copy of the API-Football data and one daily counter.

How the 100/day budget is kept (`server/budget.js`, limit 95 by default, `AF_DAILY_LIMIT` to change):
- Whole season fixture list per league: 1 request / 6 h. Dates, team pages, league matches and head-to-head use it.
- Live scores: one batched request for every match in play, every 5–15 min, only during matches.
- Standings 6 h · top scorers 24 h · team info & squad 7 days · match details only when opened.
- Extras (line-ups, squads, top scorers, head-to-head) stop at 60% of the budget so live scores keep working.
- When the budget is used up, the last saved data shows, marked "Delayed". Resets 01:00 Nigeria time.
- `/api/status` shows today's usage under `freePlan.budget`.

If the free plan doesn't include the current season for a league, SPL shows it as "Not in data plan"
and stops asking for 12 hours.

## Testing locally without keys

```
npm run test:fd   # http://localhost:8787 with football-data-shaped fake data
npm run test:af   # http://localhost:8788 with API-Football-shaped fake data
```
The fake data lives only in `test/` and is never deployed.

## Built-in safeguards

- Keys stay server-side; browser calls only `/api/*`.
- Cached per data type (live 30–60s, tables 10 min, teams 6–12h, finished matches 1 day).
- If the provider fails or rate-limits, the last good data is served and marked **Delayed**.
- `—` means "not supplied by the provider"; `0` is a real zero.
- News, player profiles and match alerts are labelled **Coming soon** — nothing placeholder.

## Next stages

2 — player profiles, news & transfers (licensed feed), advanced stats ·
3 — alerts, AI assistant, previews, calendar, highlights ·
4 — wider coverage, history, premium (Pi payments).
