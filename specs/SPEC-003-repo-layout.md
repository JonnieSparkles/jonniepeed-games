# SPEC-003: Repo layout

Status: spec only. This records the agreed layout and the work for a later implementation PR. Layout moves, clean-link changes and manifest tooling are deferred to that implementation PR; Stick Army's visual/performance fixes and tuning panel are separate work on that branch.

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

GitHub Pages and the custom domain serve directory indexes. Arweave publishing must explicitly map both `<slug>/` and `<slug>` to the **same transaction ID** as `<slug>/index.html` for every game folder. Keep the manifest's root `index.path` set to `index.html` so the clean studio root works too. These are entries for the new navigation scheme, not redirects or old-layout compatibility copies. Canonical links and metadata use the trailing-slash form.

A slashless alias needs extra care: mapping HTML alone does not change the browser's base URL. At `/slug`, `game.js` otherwise resolves outside the game, and `../` can escape the site mount. Before any relative resource is parsed, set the document base to that entry's trailing-slash directory when it is served through a slashless alias. A small inline classic-script bootstrap can create a `<base>` from the current URL with `/` appended to its pathname and query/fragment removed, only for slashless directory entries; preserve the origin and the entire mount prefix. Apply this to the home entry too if a gateway serves a bare manifest ID without a slash. Leave directory and explicit `index.html` entry URLs, including `file://` local previews, unchanged. This does not redirect or add a history entry. Test fragment links and `#tune` with the base in place.

Relative scripts, fonts, images and back links must work unchanged under `https://jonniesparkles.github.io/jonniepeed-games/`, `https://games.sparklelabs.org/`, an ar.io gateway's `/<manifest-id>/` mount, and an ArNS root. Do not substitute absolute GitHub URLs for internal navigation. `og:url` remains absolute using the existing GitHub Pages base, with clean trailing-slash page paths; preview image URLs still name their image files.

### Tests and tools

`tools/` contains repo tools: stamp, board checks, social-preview generation. Game-specific harnesses belong in `tests/<slug>/`. Move the entire current `tools/stick-army/` harness, including the throttled performance runner. Backend API tests under `scores/test/` stay with the backend; they are not per-game browser harnesses. Repo operations docs should explain generic tooling; a game's living doc lists its own tests.

### File size and splitting

There is no hard line limit. Split a game when a file passes about 2,000 lines, or earlier when there is a clear seam. Every game keeps sound in `audio.js`; the layout implementation extracts Stick Army's procedural audio from `game.js`. Keep best-score storage and run state in the game. Item and enemy tables are the next natural split into a game-local `data.js` when useful.

Use plain classic `<script>` files sharing a small, explicit global API, following the existing audio modules. Do not convert to ES modules: module scripts do not load through `file://`, which remains supported by the preview generator and local testing. Load audio and any data definitions before `game.js`. Keep a clear `init/play/muted` contract for sound rather than exposing every oscillator helper. The optional `tune.js` remains game-local and loads only for `#tune`; it is not part of the normal player's interface.

## Implementation

### Complete current asset inventory and destinations

These are source-to-destination mappings, including unchanged shared files. Inventory is against `stick-army` with the fixes in draft PR #3. Recheck for newly added files when the later implementation PR starts.

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
| `site/stick-army/tune.js` | Same | Game-local, conditional classic script; update bridge if audio/data are extracted |
| `site/thimbleful/index.html` | Same | Clean metadata/home link and moved shared favicon; existing audio/game scripts remain local |
| `site/thimbleful/game.js` | Same | No layout move |
| `site/thimbleful/audio.js` | Same | Already split correctly |
| `site/dont-step-on-a-crack/index.html` | Same | Clean metadata/home link and moved shared favicon; existing audio/game scripts remain local |
| `site/dont-step-on-a-crack/game.js` | Same | No layout move |
| `site/dont-step-on-a-crack/audio.js` | Same | Already split correctly |
| `site/index.html` | Same | Studio asset links, shelf thumbnails and clean game links |
| `tools/og/make.py` | Same | Repo tool; change outputs and studio input paths |
| No current file | New `tools/arweave_manifest.py` | Generate exact asset paths, game aliases and root index from upload receipts; validate before manual upload |
| `tools/stamp.py` | Same | Repo tool; verify stamping covers changed and conditional scripts |
| `tools/check_boards.py` | Same | Repo tool; board contract unchanged |
| `README.md` | Same | Layout, Standards, Adding a game, Social previews and Publishing to Arweave / ArNS |
| `AGENTS.md` | Same | New docs/assets/tests/script rules |
| `specs/SPEC-001-leaderboards.md` | Same | Historical work order; preserve historic examples |
| `specs/SPEC-002-stick-army.md` | Same | Historical work order; update navigation link to the current game doc if needed |
| `specs/SPEC-003-repo-layout.md` | Same | Record completion and link to current documentation |

`brand/`, `scores/` (including `scores/test/`), the existing manual workflows, and all other paths are unchanged. `data.js` has no source path today: create it only when extracting the item/enemy tables is helpful, using a classic script loaded before the game.

### Required code and documentation changes

1. Move the files exactly as mapped; extract Stick Army audio in the same later PR. Do not mix in gameplay/scoring changes. Update `game.js` and classic script order to use the extracted sound API. Keep the tuning bridge and response-injected test access working after that extraction.
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
7. Add AGENTS rules: numbered repo operations guides only in `docs/guides/`; living game docs in `docs/games/<slug>.md`, linked to historical specs; player help inside the game; shared-only top-level assets and studio/game ownership; per-game harnesses in `tests/<slug>/`; audio in game-local `audio.js`; roughly 2,000 lines or a clear seam prompts splitting, with classic scripts and no ES modules; player-facing game links use `<slug>/`, game-to-home links use `../`, and manual Arweave manifests include both game aliases.
8. For moved Stick Army runners, `Path(__file__).resolve().parents[2]` still resolves to the repo root. Keep each `case-*.js` beside the runner, update the documented commands to `tests/stick-army/test.py`, `ui.py` and `perf.py`, and update any script/help text referring to `tools/stick-army/`. Check both HTTP and conditional tuning paths. Do not move backend API tests.
9. Move the living game doc and fix inbound links, especially SPEC-002's pointer to it. Same-depth relative links such as `../../specs/` remain valid; verify rather than guessing. Historical specs can retain paths in descriptions of past work, but current navigation and executable commands in living docs must resolve.
10. Search the repository for every old path, separating intentional historical references from live links, generator outputs and commands. Regenerate cards, then run `python3 tools/stamp.py` **after all changes in `site/`**, including moved images and any dynamically loaded script references. The later PR removes old asset paths outright: no legacy asset aliases, symlinks or redirects. The clean page-entry aliases described below are intentional new manifest routes.

### Publishing, Arweave and scores

The published root remains `site/`. Today README describes a manual folder upload as one path manifest with `index.html` as its index, excluding `brand/`. There is no checked-in Arweave publishing workflow, manifest file, generator, upload command or named uploader in this repo. The exact external uploader and how it currently constructs the manifest are not recorded; do not claim an existing automated process or assume it already creates directory aliases.

Add a small standard-library Python repo tool, `tools/arweave_manifest.py`, in the later implementation PR. It generates the manifest **after file uploads** from a JSON mapping of site-relative file paths to their uploaded transaction IDs. Document how to obtain/export those receipts from the uploader actually used; adapt its receipt format explicitly rather than inventing transaction IDs. Suggested CLI: `python3 tools/arweave_manifest.py --site site --ids work/upload-ids.json --output work/manifest.json`. The script builds JSON only: it neither uploads, spends funds nor updates ArNS.

- Emit a path manifest (`manifest: "arweave/paths"`, version `0.1.0`, `index: {"path": "index.html"}`, and `paths` entries of the form `{"id": "<transaction-id>"}`). Validate compatibility with the chosen ar.io gateway before release.
- Inventory actual published files under `site/`, including moved images, fonts and scripts. Paths are exact, case-sensitive POSIX paths relative to `site/`, without a leading slash or `site/` prefix. Preserve existing content types at file upload; the manifest upload uses `application/x.arweave-manifest+json`.
- For each immediate game folder containing `index.html` (currently `dont-step-on-a-crack`, `thimbleful`, `stick-army`), retain its physical `<slug>/index.html` entry and add `<slug>/` and `<slug>` entries with that exact same ID. Discover folders, do not depend on shelf membership: Stick Army needs aliases while unlisted. Preserve the trailing slash in alias keys rather than normalizing it away.
- Set the root index to the uploaded `index.html`. Reject missing/invalid transaction IDs, missing entry files, unsafe paths and alias/file collisions. Emit deterministic sorted output, with no stale deleted paths, no duplicate uploads for aliases, and no fallback that turns missing assets into home-page HTML. Local checks must assert the three game keys share one ID and that the root index resolves.
- Run stamp before uploading site files, then use those exact upload receipts to generate and upload a fresh manifest. Rebuild/re-upload it for moved files; old manifest mappings cannot serve new paths. Review a test manifest through an ar.io gateway **before** updating the production ArNS pointer. Publishing stays manual. Old published Arweave copies remain immutable historical copies, not redirects.

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

Replace README's **Relative links, explicit `index.html`** Standard with: **Relative links, clean directory URLs.** Link to games as `<slug>/` and from game screens to home as `../`; retain relative asset paths so Pages, the custom domain and Arweave mounts work. Arweave publishing supplies exact directory aliases and a root index; slashless aliases must also resolve their relative resources correctly.

Replace README's **Publishing to Arweave / ArNS** notes with the receipt-based manual sequence above: stamp, upload `site/` files excluding `brand/`, generate/validate the root index and both aliases for every game, upload the manifest, test clean game/home navigation and assets on an ar.io gateway, then update ArNS manually when authorized. Document the actual uploader/receipt export and generator invocation. Remove the claim that links must explicitly end in `index.html`. Add the same clean-link rule to AGENTS; keep manual publishing and scores compatibility requirements.

The scores API stays backward compatible. Keep permanent game IDs, every existing board/meta key and accepted range, routes under `/v1/`, Worker/database names, and `site/assets/leaderboard.js` unchanged. No `BOARD` bump or Worker deployment is needed for asset/doc/test moves or audio extraction. Deleting a game's frontend never deletes its API records. Run `python3 tools/check_boards.py` to verify board bindings. Pages and Worker workflows remain manual (`workflow_dispatch`); there is no automatic deployment in this spec.

## Acceptance checks for the later implementation PR

- The complete inventory matches the new paths. Game-owned art is inside its game folder, studio-only art is in `assets/studio/`, and shared resources remain in `assets/`. The only old paths still appearing are explained historical references.
- `python3 tools/og/make.py` regenerates all cards/thumbnails in their new destinations: cards are 1200×630, screenshot thumbnails are 768×576 WebP, and the pixel-game thumbnail preserves its existing dimensions/format. It creates no files in the old `assets/og/` or top-level thumbnail paths.
- `python3 tools/stamp.py` runs successfully and a second run makes no changes. Absolute preview tags resolve to their intended local files and carry current hashes.
- All four pages load without console errors, missing scripts/styles/fonts/images, or 404s over a local HTTP server and under the Pages repository subpath. The default `file://` capture/local-play path still works in browsers that permit file access; no ES modules or mandatory fetch-based asset/data loading have been introduced.
- The studio's logo, ident, light/dark marks, both local-game thumbnails and Unruggabull thumbnail show. Game back links, shared favicons and touch icons work. Stick Army's listing is still approval-gated.
- Every game opens via its clean trailing-slash URL on GitHub Pages and through a freshly uploaded **test manifest on an ar.io gateway**, including unlisted Stick Army by direct link. Repeat on the custom domain; record the test manifest ID, gateway base URL and results in the implementation PR before a production ArNS update. A localhost directory-index test alone is insufficient.
- Test both `<slug>/` and `<slug>` against the test manifest: HTML, scripts, fonts, audio and images load without missing files or HTML returned as an asset. Verify each alias and `<slug>/index.html` have the same transaction ID. Test gateway mounts with a manifest-ID prefix as well as an ArNS root when available; document any gateway slash normalization.
- From each game's title/help/pause/end screen that offers home navigation, the clean back link reaches the studio in the **same mount**, and shelf links open games again. No live navigation or game `og:url` ends in `index.html`; the studio `og:url` stays at its clean root. Relative resources, fragment links and `#tune` work after slashless-base handling.
- The manifest generator's missing-ID, collision and unsafe-path checks pass; deleted game folders generate no aliases. README Standards, Adding a game, Publishing to Arweave / ArNS and AGENTS describe the new rules consistently.
- Touch, mouse, keyboard, pause, fullscreen and all supported orientations continue to work. Stick Army's audio and mute preference behave the same after extraction.
- With the local site server running, `CHROMIUM=/usr/bin/chromium python3 tests/stick-army/test.py` and `... tests/stick-army/ui.py` pass from the new location; run `... tests/stick-army/perf.py` to check the retained-ink late-wave case. The tuning panel remains opt-in and works after the audio split.
- `python3 tools/check_boards.py` passes; no scores API schema/rule/route change is present. Rebuild the Arweave path manifest and verify its exact asset keys before a later release. Neither old-path redirects nor automatic deploy triggers are added.
