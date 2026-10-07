# SPEC-003: Repo layout

Status: implemented on `repo-layout`. Current rules are in [README](../README.md#standards), [AGENTS](../AGENTS.md) and the living [Stick Army doc](../docs/games/stick-army.md). Gameplay, scoring, BOARD values and SPEC-004 are outside this layout work. Arweave publishing remains paused pending the follow-up below.

## Resolved questions

1. **Trailing-slash links only.** Studio links use `<slug>/`; game-to-home links use `../`. No slashless `<slug>` aliases and no `<base>` bootstrap script.
2. **Uploader follow-up.** No `tools/arweave_manifest.py` in this PR. The manifest must set root `index.path` to `index.html` and give every game a `<slug>/` entry with the same transaction ID as `<slug>/index.html`. Arweave publishing is paused until a follow-up confirms the uploader and adds whatever support it needs. The ar.io gateway acceptance check is deferred to that follow-up.

## Decisions

### Documentation

- `docs/guides/` is for repo operations: leaderboards, deployment and tooling. Keep the existing `NN-name.md` numbering and numbered titles.
- `specs/` is for build specs: work orders named `SPEC-NNN-name.md`, with titles beginning `# SPEC-NNN: Name`. Once implemented, a spec is history; current behavior belongs in the living doc rather than being continually rewritten into the old work order.
- Add `docs/games/<slug>.md`: one living design doc per game, unnumbered and named by its permanent folder slug. It describes current rules, tuning values, code entry points and validation, and links to the game's specs. Move `docs/guides/01-stick-army.md` to `docs/games/stick-army.md`, change its title to `# Stick Army`, and link SPEC-002 and this spec. Do not reuse `01` until checking the operations-guide numbering at implementation time.
- Player instructions belong in each game's title card/help screen. Living design docs may describe the input contract and rules for development/testing; they are not a second player manual or a prerequisite for playing.

### Published assets

`site/assets/` holds shared resources used by more than one page: fonts and their licences, the leaderboard client, favicons and the apple-touch icon. A game's preview card and shelf thumbnail belong in its folder as `site/<slug>/og.png` and `site/<slug>/thumb.<ext>`. Keep existing image formats.

Studio-only resources go in `site/assets/studio/`: the logos, ident, light pixel mark, generic index preview card and external-game thumbnails. They do not stay at the top of assets merely because the studio owns them.

**Inventory exception:** `site/assets/mark-pixel-dark.png` is already used in the studio footer and the Thimbleful and Don't Step on a Crack back links, as well as the preview generator. Keep it at the top of assets because it is shared across pages. The light `mark-pixel.png` is studio-only and moves. Do not duplicate the dark mark or break the game back links to force it into the studio folder.

Move the root `site/favicon.ico` to `site/assets/favicon.ico` and make the icon links explicit on every page. It is a shared favicon, not game-owned art.

The goal is that deleting a game's folder removes all its published game files and game-owned art. Retiring a game also removes its studio shelf entry and `GAMES` generator entry so they cannot reference/recreate the deleted folder. Design docs and test harnesses are outside the published site and can be retired in the same change; specs remain historical. Permanent scores API game/board records are the deliberate exception to deletion, as described below.

### Clean game and home URLs

Player-facing navigation uses directory URLs: `href="<slug>/"` from the studio and `href="../"` from a game back to the studio. This includes back links on title, pause, help and game-over screens. Keep links relative, with the trailing slash; do not use origin-root links such as `/`, which lose the repository or manifest prefix. Physical entry files remain `index.html` and `<slug>/index.html`; this is a URL change, not a file rename.

GitHub Pages and the custom domain serve directory indexes. A future Arweave manifest must map `<slug>/` to the **same transaction ID** as `<slug>/index.html` for every game folder, including unlisted games. Keep root `index.path` set to `index.html`. No slashless entries or base bootstrap are required. Canonical links and metadata use the trailing-slash form.

Relative scripts, fonts, images and back links must work unchanged under `https://jonniesparkles.github.io/jonniepeed-games/`, `https://games.sparklelabs.org/`, an ar.io gateway's `/<manifest-id>/` mount, and an ArNS root. Do not substitute absolute GitHub URLs for internal navigation. `og:url` remains absolute using the existing GitHub Pages base, with clean trailing-slash page paths; preview image URLs still name their image files.

### Tests and tools

`tools/` contains repo tools: stamp, board checks, social-preview generation. Game-specific harnesses belong in `tests/<slug>/`. Move the entire current `tools/stick-army/` harness, including the throttled performance runner. Backend API tests under `scores/test/` stay with the backend; they are not per-game browser harnesses. Repo operations docs should explain generic tooling; a game's living doc lists its own tests.

### File size and splitting

There is no hard line limit. Split a game when a file passes about 2,000 lines, or earlier when there is a clear seam. Every game keeps sound in `audio.js`; the layout implementation extracts Stick Army's procedural audio from `game.js`. Keep best-score storage and run state in the game. Item and enemy tables are the next natural split into a game-local `data.js` when useful.

Use plain classic `<script>` files sharing a small, explicit global API, following the existing audio modules. Do not convert to ES modules: module scripts do not load through `file://`, which remains supported by the preview generator and local testing. Load audio and any data definitions before `game.js`. Keep a clear `init/play/muted` contract for sound rather than exposing every oscillator helper. The optional `tune.js` remains game-local and loads only for `#tune`; it is not part of the normal player's interface.

## Implementation

### Complete current asset inventory and destinations

These are source-to-destination mappings, including unchanged shared files. Inventory was redone before any moves against current `main`, commit `5afe78f7e84006db759834481d5ee39e320f4689` (merged PR #3), including all HTML/JavaScript navigation, asset references and newer title-screen high-score controls. The asset mappings remain complete: no additional game-owned files were found. High-score controls and the shared leaderboard client stay unchanged; only their pages' layout references and metadata change. The link table below records every existing home/shelf link; Stick Army still has no home link. `docs/guides/00-leaderboards.md` is the only remaining operations guide, and no guide number was reused.

| Current path | New path | Reason |
| --- | --- | --- |
| `site/assets/apple-touch-icon.png` | `site/assets/apple-touch-icon.png` | Shared; unchanged |
| `site/assets/favicon-32.png` | `site/assets/favicon-32.png` | Shared; unchanged |
| `site/assets/fonts/LICENSE-schoolbell.txt` | `site/assets/fonts/LICENSE-schoolbell.txt` | Shared fonts/style/licence; unchanged |
| `site/assets/fonts/OFL-atkinson-hyperlegible.txt` | `site/assets/fonts/OFL-atkinson-hyperlegible.txt` | Shared fonts/style/licence; unchanged |
| `site/assets/fonts/OFL-cabin-sketch.txt` | `site/assets/fonts/OFL-cabin-sketch.txt` | Shared fonts/style/licence; unchanged |
| `site/assets/fonts/OFL-ibm-plex-mono.txt` | `site/assets/fonts/OFL-ibm-plex-mono.txt` | Shared fonts/style/licence; unchanged |
| `site/assets/fonts/OFL-pixelify-sans.txt` | `site/assets/fonts/OFL-pixelify-sans.txt` | Shared fonts/style/licence; unchanged |
| `site/assets/fonts/OFL-silkscreen.txt` | `site/assets/fonts/OFL-silkscreen.txt` | Shared fonts/style/licence; unchanged |
| `site/assets/fonts/atkinson-hyperlegible-latin-400-normal.woff2` | `site/assets/fonts/atkinson-hyperlegible-latin-400-normal.woff2` | Shared fonts/style/licence; unchanged |
| `site/assets/fonts/atkinson-hyperlegible-latin-700-normal.woff2` | `site/assets/fonts/atkinson-hyperlegible-latin-700-normal.woff2` | Shared fonts/style/licence; unchanged |
| `site/assets/fonts/cabin-sketch-latin-700-normal.woff2` | `site/assets/fonts/cabin-sketch-latin-700-normal.woff2` | Shared fonts/style/licence; unchanged |
| `site/assets/fonts/fonts.css` | `site/assets/fonts/fonts.css` | Shared fonts/style/licence; unchanged |
| `site/assets/fonts/ibm-plex-mono-latin-600-normal.woff2` | `site/assets/fonts/ibm-plex-mono-latin-600-normal.woff2` | Shared fonts/style/licence; unchanged |
| `site/assets/fonts/pixelify-sans-latin-400-normal.woff2` | `site/assets/fonts/pixelify-sans-latin-400-normal.woff2` | Shared fonts/style/licence; unchanged |
| `site/assets/fonts/pixelify-sans-latin-600-normal.woff2` | `site/assets/fonts/pixelify-sans-latin-600-normal.woff2` | Shared fonts/style/licence; unchanged |
| `site/assets/fonts/schoolbell-latin-400-normal.woff2` | `site/assets/fonts/schoolbell-latin-400-normal.woff2` | Shared fonts/style/licence; unchanged |
| `site/assets/fonts/silkscreen-latin-400-normal.woff2` | `site/assets/fonts/silkscreen-latin-400-normal.woff2` | Shared fonts/style/licence; unchanged |
| `site/assets/ident.js` | `site/assets/studio/ident.js` | Studio-only |
| `site/assets/leaderboard.js` | `site/assets/leaderboard.js` | Shared; unchanged |
| `site/assets/logo-dark.webp` | `site/assets/studio/logo-dark.webp` | Studio-only |
| `site/assets/logo.webp` | `site/assets/studio/logo.webp` | Studio-only |
| `site/assets/mark-pixel-dark.png` | `site/assets/mark-pixel-dark.png` | Shared studio and game back-link mark; unchanged |
| `site/assets/mark-pixel.png` | `site/assets/studio/mark-pixel.png` | Studio-only |
| `site/assets/og/dont-step-on-a-crack.png` | `site/dont-step-on-a-crack/og.png` | Game-owned preview |
| `site/assets/og/index.png` | `site/assets/studio/og.png` | Studio-only preview |
| `site/assets/og/stick-army.png` | `site/stick-army/og.png` | Game-owned preview |
| `site/assets/og/thimbleful.png` | `site/thimbleful/og.png` | Game-owned preview |
| `site/assets/thumb-dont-step-on-a-crack.webp` | `site/dont-step-on-a-crack/thumb.webp` | Game-owned shelf art |
| `site/assets/thumb-stick-army.webp` | `site/stick-army/thumb.webp` | Game-owned shelf art |
| `site/assets/thumb-thimbleful.png` | `site/thimbleful/thumb.png` | Game-owned shelf art |
| `site/assets/thumb-unruggabull.webp` | `site/assets/studio/thumb-unruggabull.webp` | External-game shelf art; studio-only |
| `site/favicon.ico` | `site/assets/favicon.ico` | Shared favicon; use explicit links |

After migrating these files, remove the empty `site/assets/og/` directory. There are no legacy copies or redirects.

### Documentation, tests and game files

| Current path | New path | Work |
| --- | --- | --- |
| `docs/guides/00-leaderboards.md` | Same | Operations guide remains numbered; check examples for moved resources |
| `docs/guides/01-stick-army.md` | `docs/games/stick-army.md` | Living game doc; change title and inbound links |
| `tools/stick-army/case-01-balance.js` | `tests/stick-army/case-01-balance.js` | Move harness file |
| `tools/stick-army/case-02-ink.js` | `tests/stick-army/case-02-ink.js` | Move harness file |
| `tools/stick-army/case-03-enemies.js` | `tests/stick-army/case-03-enemies.js` | Move harness file |
| `tools/stick-army/case-04-shop.js` | `tests/stick-army/case-04-shop.js` | Move harness file |
| `tools/stick-army/case-05-upgrades.js` | `tests/stick-army/case-05-upgrades.js` | Move harness file |
| `tools/stick-army/case-06-flow.js` | `tests/stick-army/case-06-flow.js` | Move harness file |
| `tools/stick-army/perf.py` | `tests/stick-army/perf.py` | Move harness file |
| `tools/stick-army/test.py` | `tests/stick-army/test.py` | Move harness file |
| `tools/stick-army/ui.py` | `tests/stick-army/ui.py` | Move harness file |
| `site/stick-army/index.html` | Same | Clean page URL, local OG image URL, moved shared favicon; classic script order |
| `site/stick-army/game.js` | Same, with audio extracted to new `site/stick-army/audio.js` | Extract audio seam; preserve behavior |
| No current file | New `site/stick-army/audio.js` | Classic init/play/muted sound API; synthesis extracted unchanged |
| `site/stick-army/tune.js` | Same | Game-local, conditional classic script; update bridge if audio/data are extracted |
| `site/thimbleful/index.html` | Same | Clean metadata/home link and moved shared favicon; existing audio/game scripts remain local |
| `site/thimbleful/game.js` | Same | No layout move |
| `site/thimbleful/audio.js` | Same | Already split correctly |
| `site/dont-step-on-a-crack/index.html` | Same | Clean metadata/home link and moved shared favicon; existing audio/game scripts remain local |
| `site/dont-step-on-a-crack/game.js` | Same | No layout move |
| `site/dont-step-on-a-crack/audio.js` | Same | Already split correctly |
| `site/index.html` | Same | Studio asset links, shelf thumbnails and clean game links |
| `tools/og/make.py` | Same | Repo tool; change outputs and studio input paths |
| `tools/stamp.py` | Same | Repo tool; verify stamping covers changed and conditional scripts |
| `tools/check_boards.py` | Same | Repo tool; board contract unchanged |
| `README.md` | Same | Layout, Standards, Adding a game, Social previews and Publishing to Arweave / ArNS |
| `AGENTS.md` | Same | New docs/assets/tests/script rules |
| `specs/SPEC-001-leaderboards.md` | Same | Historical work order; preserve historic examples |
| `specs/SPEC-002-stick-army.md` | Same | Historical work order; update navigation link to the current game doc if needed |
| `specs/SPEC-003-repo-layout.md` | Same | Record completion and link to current documentation |
| `specs/SPEC-004-side-b.md` | Same | Fix the living-doc pointer only; do not implement Side B |

`brand/`, `scores/` (including `scores/test/`), the existing manual workflows, and all other paths are unchanged. `data.js` has no source path today: create it only when extracting the item/enemy tables is helpful, using a classic script loaded before the game.

### Required code and documentation changes

1. Move the files exactly as mapped; extract Stick Army audio in this layout PR. Do not mix in gameplay/scoring changes. Update `game.js` and classic script order to use the extracted sound API. Keep the tuning bridge and response-injected test access working after that extraction.
2. Update `tools/og/make.py`:
   - Game cards write to `SITE / slug / 'og.png'`; thumbnails write to `SITE / slug / 'thumb.png'` or `'thumb.webp'`. Ensure the owning game folder exists; skip/report a deleted game rather than resurrecting it from a stale entry.
   - The generic studio card writes to `SITE / 'assets' / 'studio' / 'og.png'`.
   - Fonts remain at `site/assets/fonts/`, and the shared dark mark stays `site/assets/mark-pixel-dark.png`. Change any studio-only inputs to `assets/studio/` when applicable. `brand/logo.png` remains source art outside the site.
   - Update the script's description/output documentation. Preserve canvas vs page captures, current thumbnail formats, and both default file URLs and `SITE_URL` HTTP captures.
3. Update **both** `og:image` and `twitter:image` in all four pages to these absolute URLs before running stamp:

   | Page | Absolute preview URL |
   | --- | --- |
   | `site/index.html` | `https://jonniesparkles.github.io/jonniepeed-games/assets/studio/og.png` |
   | `site/thimbleful/index.html` | `https://jonniesparkles.github.io/jonniepeed-games/thimbleful/og.png` |
   | `site/dont-step-on-a-crack/index.html` | `https://jonniesparkles.github.io/jonniepeed-games/dont-step-on-a-crack/og.png` |
   | `site/stick-army/index.html` | `https://jonniesparkles.github.io/jonniepeed-games/stick-army/og.png` |

   Keep card dimensions/alt text. Change page `og:url` values as specified below. Stamp supplies fresh `?v=` hashes; do not retain hashes from old assets.
4. Update the studio shelf paths to `thimbleful/thumb.png`, `dont-step-on-a-crack/thumb.webp`, and `assets/studio/thumb-unruggabull.webp`. Stick Army remains off the shelf until owner approval; a later approved card will use `stick-army/thumb.webp` and `stick-army/`. Change the existing shelf hrefs from `thimbleful/index.html` and `dont-step-on-a-crack/index.html` to `thimbleful/` and `dont-step-on-a-crack/`; the external Unruggabull URL is unchanged.
5. Update the studio's logos, light mark and ident script to `assets/studio/`. Keep back-link images and the studio's dark mark pointing to the shared dark mark; change back-link destinations to `../` as specified below. Change Stick Army's favicon to `../assets/favicon.ico`; add/update the studio's explicit ICO link as appropriate, retaining shared PNG and apple-touch icons on every page that already uses them.
6. Update README **Layout** to show `assets/studio/`, game-local cards/thumbnails, `docs/games/` and `tests/<slug>/`. Update **Standards** with the ownership rule, documentation lifecycle, classic scripts and split guidance. Also update **Adding a game** (shelf href `yourgame/`), **Social previews**, **Publishing to Arweave / ArNS** and any test examples so newly added games follow the layout and clean-URL rules below.
7. Add AGENTS rules: numbered repo operations guides only in `docs/guides/`; living game docs in `docs/games/<slug>.md`, linked to historical specs; player help inside the game; shared-only top-level assets and studio/game ownership; per-game harnesses in `tests/<slug>/`; audio in game-local `audio.js`; roughly 2,000 lines or a clear seam prompts splitting, with classic scripts and no ES modules; player-facing game links use `<slug>/`, game-to-home links use `../`, and manual Arweave manifests include the trailing-slash entry for every game and root index.html. Publishing remains paused for the uploader follow-up.
8. For moved Stick Army runners, `Path(__file__).resolve().parents[2]` still resolves to the repo root. Keep each `case-*.js` beside the runner, update the documented commands to `tests/stick-army/test.py`, `ui.py` and `perf.py`, and update any script/help text referring to `tools/stick-army/`. Check both HTTP and conditional tuning paths. Do not move backend API tests.
9. Move the living game doc and fix inbound links, especially SPEC-002's pointer to it. Same-depth relative links such as `../../specs/` remain valid; verify rather than guessing. Historical specs can retain paths in descriptions of past work, but current navigation and executable commands in living docs must resolve.
10. Search the repository for every old path, separating intentional historical references from live links, generator outputs and commands. Regenerate cards, then run `python3 tools/stamp.py` **after all changes in `site/`**, including moved images and any dynamically loaded script references. This PR removes old asset paths outright: no legacy asset aliases, symlinks or redirects. The future trailing-slash manifest entries described below are intentional directory routes.

### Publishing, Arweave and scores

The published root remains `site/`. There is no checked-in Arweave publishing workflow, manifest file, generator, upload command or named uploader. No manifest tool is added in this PR. **Arweave publishing is paused** until a follow-up confirms the uploader and adds whatever support it needs; the ar.io gateway acceptance check is follow-up work.

The required future manifest contains:

- `manifest: "arweave/paths"`, version `0.1.0`, root `index: {"path": "index.html"}`, and `paths` entries of the form `{"id": "<transaction-id>"}`.
- Exact, case-sensitive POSIX paths for all files actually published under `site/`, including moved images, fonts and scripts, without a leading slash or `site/` prefix. Upload `site/` only; exclude `brand/`. Preserve file content types; the manifest uses `application/x.arweave-manifest+json`.
- For every immediate game folder containing `index.html` (currently `dont-step-on-a-crack`, `thimbleful`, `stick-army`), both `<slug>/index.html` and `<slug>/` entries pointing to the exact same transaction ID. Discover folders, not shelf membership: unlisted Stick Army needs a directory entry too. Preserve the trailing slash. No slashless `<slug>` entry.
- The root index pointing to the uploaded studio `index.html`, with no stale deleted paths, duplicate alias uploads or fallback returning studio HTML for missing assets.

Follow-up: confirm the uploader and receipt export, add any necessary manifest support, validate IDs/paths/collisions and root/directory mappings, then stamp and upload the exact site files and a fresh manifest. Test clean game/home navigation, assets and `#tune` through an ar.io gateway at a manifest-ID mount and an ArNS root when available. Record test manifest ID, gateway base URL and results before any manual production ArNS update. Old published copies remain immutable history. No uploads, ArNS updates or gateway checks belong to this PR.

#### Link and documentation changes

| Current location / URL | Required clean URL / change |
| --- | --- |
| `site/index.html` shelf: `dont-step-on-a-crack/index.html` | `dont-step-on-a-crack/` |
| `site/index.html` shelf: `thimbleful/index.html` | `thimbleful/` |
| Future owner-approved Stick Army shelf card | `stick-army/`; do not add the card in this work |
| `site/thimbleful/index.html` `.back`: `../index.html` | `../` |
| `site/dont-step-on-a-crack/index.html` title-screen `.studio`: `../index.html` | `../` |
| Stick Army game screens | No home link currently exists; any home link added by the implementation uses `../`. Audit all screens and future links for the same rule. |
| Studio `og:url` | Keep `https://jonniesparkles.github.io/jonniepeed-games/` |
| Thimbleful `og:url` | `https://jonniesparkles.github.io/jonniepeed-games/thimbleful/` |
| Don't Step on a Crack `og:url` | `https://jonniesparkles.github.io/jonniepeed-games/dont-step-on-a-crack/` |
| Stick Army `og:url` | `https://jonniesparkles.github.io/jonniepeed-games/stick-army/` |

Audit HTML and JavaScript for navigation from every game screen back to home, plus any canonical/share URLs added later. Keep explicit entry paths in filesystem inventories and file-based tooling; dropping `index.html` from player-facing URLs does not mean deleting the physical file or changing `tools/og/make.py`'s file capture path. Metadata images remain absolute GitHub Pages file URLs per the current standard.

Replace README's **Relative links, explicit `index.html`** Standard with: **Relative links, clean directory URLs.** Link to games as `<slug>/` and from game screens to home as `../`; retain relative asset paths so Pages, the custom domain and Arweave mounts work. Arweave publishing supplies exact directory aliases and a root index; slashless aliases and base bootstraps are not used.

Replace README's **Publishing to Arweave / ArNS** notes with the required manifest contents and paused publishing/follow-up above. Remove the claim that links must explicitly end in `index.html`. Add the same clean-link rule to AGENTS; keep manual publishing and scores compatibility requirements.

The scores API stays backward compatible. Keep permanent game IDs, every existing board/meta key and accepted range, routes under `/v1/`, Worker/database names, and `site/assets/leaderboard.js` unchanged. No `BOARD` bump or Worker deployment is needed for asset/doc/test moves or audio extraction. Deleting a game's frontend never deletes its API records. Run `python3 tools/check_boards.py` to verify board bindings. Pages and Worker workflows remain manual (`workflow_dispatch`); there is no automatic deployment in this spec.

## Acceptance checks for this implementation PR

- The complete inventory matches the new paths. Game-owned art is inside its game folder, studio-only art is in `assets/studio/`, and shared resources remain in `assets/`. The only old paths still appearing are explained historical references.
- `python3 tools/og/make.py` regenerates all cards/thumbnails in their new destinations: cards are 1200×630, screenshot thumbnails are 768×576 WebP, and the pixel-game thumbnail preserves its existing dimensions/format. It creates no files in the old `assets/og/` or top-level thumbnail paths.
- `python3 tools/stamp.py` runs successfully and a second run makes no changes. Absolute preview tags resolve to their intended local files and carry current hashes.
- All four pages load without console errors, missing scripts/styles/fonts/images, or 404s over a local HTTP server and under the Pages repository subpath. The default `file://` capture/local-play path still works in browsers that permit file access; no ES modules or mandatory fetch-based asset/data loading have been introduced.
- The studio's logo, ident, light/dark marks, both local-game thumbnails and Unruggabull thumbnail show. Game back links, shared favicons and touch icons work. Stick Army's listing is still approval-gated.
- From each game's title/help/pause/end screen that offers home navigation, the clean back link reaches the studio in the **same mount**, and shelf links open games again. No live navigation or game `og:url` ends in `index.html`; the studio `og:url` stays at its clean root. Relative resources, fragment links and `#tune` work with trailing-slash directory navigation.
- README Standards, Adding a game, Publishing to Arweave / ArNS and AGENTS describe the new rules consistently, including paused Arweave publishing and the uploader/gateway follow-up.
- Touch, mouse, keyboard, pause, fullscreen and all supported orientations continue to work. Stick Army's audio and mute preference behave the same after extraction.
- With the local site server running, `CHROMIUM=/usr/bin/chromium python3 tests/stick-army/test.py` and `... tests/stick-army/ui.py` pass from the new location; run `... tests/stick-army/perf.py` to check the retained-ink late-wave case. The tuning panel remains opt-in and works after the audio split.
- `python3 tools/check_boards.py` passes; no scores API schema/rule/route change is present. Rebuild and verify the Arweave path manifest in the deferred uploader follow-up before a later release. Neither old-path redirects nor automatic deploy triggers are added.

## Deferred publishing acceptance

The uploader follow-up must confirm the uploader, add any needed support and validate a fresh test manifest through an ar.io gateway, including every trailing-slash game URL, exact asset keys, root index and same-mount home links. Record its transaction ID and gateway results before resuming manual Arweave/ArNS publishing. Live Pages/custom-domain deployment checks belong to manual release; this PR checks their repository-prefix navigation over local HTTP.

## Implementation check results

- Complete asset inventory and all local references verified against the tables; old paths are gone. Remaining old-path text is historical inventory/work-order context in SPEC-003 and the original ident description in unimplemented SPEC-004.
- HTTP preview regeneration passed: four 1200×630 cards, two 768×576 WebP thumbnails and the existing 384×288 PNG thumbnail. Stamp ran last; its second run changed zero links. Board checks passed (Crack 1, Thimbleful 2).
- All four pages passed at desktop, portrait and landscape sizes over local HTTP at both the root and `/jonniepeed-games/`, without console errors, failed requests or missing files. Shelf/back links, logos/marks, ident, favicon/touch icons and absolute preview hashes passed. Stick Army remains unlisted and noindexed.
- Moved regression and UI runners passed, including all six cases, four UI sizes, fullscreen/input/shop/pizza and opt-in tuning with clipboard success/fallback.
- Wave-6 performance passed at 4× CPU throttle with 500 retained ink marks: normal 50.3 FPS (mean RAF 19.89 ms, p95 33.4 ms); stress 52.6 FPS (mean RAF 19.01 ms, p95 33.4 ms). These are environment measurements, not a performance guarantee.
- All 19 extracted effects matched main's node/envelope scheduling, init/resume, 45 ms throttle and mute. Native browser WebAudio and stored mute/unmute across reloads passed. Gameplay/scoring changes were excluded by an exact audio-substitution comparison; other game scripts, the shared leaderboard client, backend and manual workflows are unchanged.
- This environment blocks `file://` in Chromium (`ERR_BLOCKED_BY_ADMINISTRATOR`), so default file capture could not be exercised here; the original file-capture branches and classic-script loading remain. HTTP captures and the deleted-game generator guard passed. Thimbleful/Crack mouse, touch, keyboard and fullscreen checks passed in all three orientations. The performance runner's historical `--source-ref` mode also passed. No ar.io gateway check or publishing was performed; see deferred publishing acceptance above.
