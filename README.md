# JonniePeed Games

Small browser games and pixel scenes. Plain static files, no build step.

Live site: https://jonniepeed.games/ · Scores API: https://scores.jonniepeed.games/

## Layout

```
site/                   everything that gets published
  index.html            studio page: logo, game shelf, pixel easter egg (assets/studio/ident.js), sound (assets/studio/audio.js)
  thimbleful/           catch-the-drips game, with a "Just watch" mode (#watch)
  stick-army/           notebook turret game with recruits and a between-wave shop (Side B demo, noindexed)
  dont-step-on-a-crack/  first-person sidewalk game; title screen runs a demo walk, Mom Cam in the HUD
  assets/               shared fonts, leaderboard and play stats clients, dark mark and favicons
  assets/studio/        logos, ident.js, audio.js, light mark, og.png and external-game thumbnails
  <slug>/og.png         game-owned social preview card
  <slug>/thumb.<ext>    game-owned shelf thumbnail (retain its image format)
  <slug>/audio.js       classic sound script loaded before game.js
  assets/fonts/         Silkscreen, Pixelify Sans, Cabin Sketch, Atkinson Hyperlegible, IBM Plex Mono (SIL OFL)
                        and Schoolbell (Apache 2.0), self-hosted
tools/og/make.py        builds the social preview cards and shelf thumbnails (cover art, pixel canvases, or page screenshots)
tools/stamp.py          adds ?v=<hash> to file links so updates aren't stuck in browser caches
tools/check_boards.py   checks game BOARD constants before deploying
tools/balance/          balance bots: seeded headless runs at several skill levels, with reports
tools/trailer/          trailers: scripted gameplay captured frame by frame, the game's own sound, music and the cut
scores/                Cloudflare Worker, D1 schema, rules and API tests (not published with site/)
stats/                  play stats Worker, D1 schema, private dashboards and tests (not published with site/)
specs/                  build specs, one file each: SPEC-001-name.md, SPEC-002-name.md, ...
docs/guides/            numbered repo operations guides: 00-name.md, 01-name.md, ...
docs/games/             living game design docs: <slug>.md (unnumbered)
tests/<slug>/           per-game browser harnesses, plus balance.js, bot.js and balance.json for games with balance bots,
                        and trailer/ for games with a trailer; backend tests stay in scores/test/ and stats/test/
work/                   local tool output such as work/balance/ and work/trailer/ (git-ignored, never committed)
brand/                  source logo and cover art files, not published
  covers/<slug>.png               game cover art, full size, title lettered in (make.py crops it)
  logo.png, logo-dark.png         full logo, transparent, light and dark versions
  mark.png, mark-dark.png         stick figure mark
  mark-pixel*.png                 pixel-art mark (1x and 8x)
  icon-192.png, icon-512.png, apple-touch-icon.png, favicon.ico
  logo-animated.mp4               animated logo, 6s, no audio (for social posts)
  logo-animated-original.mp4      the original animated logo as made, with audio
```

Unruggabull lives in its own repo and is linked from the shelf at https://unruggabull.ar.io.

## Standards

These apply to every change:

- **Full screen and every orientation.** Each game or scene has a full screen mode and works in portrait, landscape and on desktop. Exceptions are fine when noted. Thimbleful's "full screen" section in `thimbleful/game.js` is the reference.
- **No double-tap zoom.** iPhones zoom on a quick double tap, and they ignore `user-scalable=no`. Every page sets `*{touch-action:manipulation}` near the top of its CSS; game surfaces use `touch-action:none` and scrolling cards `pan-y`. Pinch zoom still works.
- **Cache busting.** Run `python3 tools/stamp.py` after any change in `site/`, so changed files get new `?v=` links.
- **Social previews.** Every page has Open Graph and Twitter tags and a 1200×630 card. Rebuild with `python3 tools/og/make.py`. The index card stays generic and never lists games.
- **Relative links, clean directory URLs.** Player links use `<slug>/` from the studio and `../` from games back home, preserving the site mount. Assets remain relative; entry files remain `index.html`. No slashless aliases or `<base>` bootstrap. Arweave manifests need the directory entries described below. The one exception is `site/404.html`: GitHub Pages serves it at whatever missing path was asked for, so its assets use absolute `https://jonniepeed.games/` URLs (which `stamp.py` still versions) and its home links use `/`.
- **Asset ownership.** Only shared files belong at the top of `site/assets/`. Studio-only files belong in `assets/studio/`; game-owned files, including `og.png` and `thumb.<ext>`, belong in `site/<slug>/`. Keep image formats. Retiring a game removes its shelf and `GAMES` entries too; permanent scores API records remain.
- **Game docs first.** Each game's current rules, tuning, code entry points and validation live in its unnumbered `docs/games/<slug>.md`, linked to its specs. Read it before changing the game, and update it in the same change. Player help stays inside the game.
- **Specs and guides.** Build specs live in `specs/` as `SPEC-NNN-name.md` and stay historical once built; take the next number not already used on `main`. Operations guides live in `docs/guides/` as `NN-name.md`, numbered from `00`. Each title starts with its number (`# SPEC-001: Name`, `# 00: Name`), and a guide built from a spec links to it at the top.
- **Scripts and tests.** Keep audio in game-local `audio.js` with a small `init/play/muted` API; best-score storage and run state stay in the game. Split around 2,000 lines or a clear seam. Use classic scripts and explicit globals, loading audio/data before `game.js`; no ES modules, so file previews keep working. Optional tuning scripts stay opt-in. Per-game harnesses live in `tests/<slug>/`; backend API tests stay in `scores/test/`.
- **No backward compatibility for pages and paths.** Remove old pages and paths outright, with no redirects or shims. Shared code and the scores API are the exceptions below.
- **Shared code stays compatible.** Code in `site/` that more than one page loads, such as `site/assets/leaderboard.js`, only grows: add functions and options, but don't rename or remove anything or change what an existing call does unless the same change updates every page that uses it. Check every page that loads it before merging; games with harnesses in `tests/<slug>/` must still pass them.
- **Online scores.** Games with scores follow [the leaderboard guide](docs/guides/00-leaderboards.md). Read it before adding scores or changing scoring, `BOARD` or `scores/games.json`; anything that changes how fast a game can score (pace, bonuses, power-ups) counts as a scoring change. Run `python3 tools/check_boards.py` after touching either. The scores API is also exempt from no backward compatibility: old published copies must keep working.
- **Play stats.** Every game reports its runs through `site/assets/stats.js` to the private dashboards ([03: Play stats](docs/guides/03-play-stats.md)). Nothing is stored on or read from the player's device for it (no device IDs, no reading saved initials; names come only from saved board rows), and a report never waits on or breaks a game. The stats API is permanent like the scores API. The dashboards stay behind Cloudflare Access: never set `DASH_OPEN` on the deployed Worker.
- **What's new when scores reset.** A board bump comes with a short What's new note on the title screen explaining the latest change. The note's button has a dot until it's opened once on that device. See [What's new notes](docs/guides/00-leaderboards.md#whats-new-notes).
- **Related, not identical.** Reuse what the other games already do (full screen, leaderboards, previews) so nothing starts from scratch, but each game is free to do things its own way.
- **Spelling.** The studio is JonniePeed Games (capital P). Lowercase `jonniepeed` only in slugs and URLs.

## Adding a game

1. Make a folder in `site/` with an `index.html` that only uses relative paths, following the standards above.
2. Add it to `GAMES` in `tools/og/make.py` and run it to make its preview card and index thumbnail. If it has cover art, put the full-size image in `brand/covers/` and give the entry a `cover` option instead of a capture (see [02: Cover art](docs/guides/02-cover-art.md)).
3. Copy one of the cards in `site/index.html` and point it at `yourgame/`, using `yourgame/thumb.<ext>` for its image. Development cards use `data-side="b" data-badge="demo" hidden` and a `.badge` span inside `.info`; unmarked cards belong to Side A. The script fills the visible, accessible badge from `data-badge` as text, so other labels need no script changes. Demo pages stay noindexed until approved for promotion.
4. Add a living `docs/games/yourgame.md` ([Thimbleful's](docs/games/thimbleful.md) is a good model) linked to its specs and any browser harness in `tests/yourgame/`. Keep sound in `yourgame/audio.js`, loaded before `game.js`. Run `python3 tools/stamp.py` last.
5. For online scores, follow the [Adding a game checklist](docs/guides/00-leaderboards.md#adding-a-game) in the leaderboard guide; deploy the Worker before the site.
6. Report runs to play stats: follow [Adding a game](docs/guides/03-play-stats.md#adding-a-game) in the play stats guide. A new game starts with stats switched off; ask Jonnie when to turn them on (usually at public testing or promotion, below).

## Side B and promotion

[Side B](specs/SPEC-004-side-b.md) is the development shelf. Hold the studio's rainbow egg with a pointer, Space or Enter: about 1.4 seconds to full power, then three more seconds as the puddle grows. Or enter `#side-b` directly. The **Side A** button returns to Games. The selected shelf lasts for this tab's visit in `sessionStorage`, including reloads and game/home round trips; a new session defaults to Side A. Side B is discoverable, not private.

Stick Army is the only launch card, labelled **demo**, with local scores only. To promote it after approval, remove the card's `data-side`, `data-badge`, `.badge` span and initial `hidden` attribute, remove the game's noindex tag, and update its living doc. **Play stats:** ask Jonnie whether to switch the game's stats on now, if they aren't already (see [Turning a game's stats off and on](docs/guides/03-play-stats.md#turning-a-games-stats-off-and-on)). Run applicable browser/preview checks, stamp last, and publish through the manual Pages workflow. An **update** label/build and any **archive** exhibit remain future work; Side B does not change leaderboard rules or enable automated publishing.

## Browser checks

Install Python Playwright and Chromium (`python3 -m pip install playwright` and `python3 -m playwright install chromium`), then serve the site from the repo root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory site
```

In another terminal:

```sh
CHROMIUM=/usr/bin/chromium python3 tests/studio/test.py
CHROMIUM=/usr/bin/chromium python3 tests/stick-army/test.py
CHROMIUM=/usr/bin/chromium python3 tests/stick-army/ui.py
CHROMIUM=/usr/bin/chromium python3 tests/stick-army/perf.py
CHROMIUM=/usr/bin/chromium python3 tests/stick-army/perf.py --stress
CHROMIUM=/usr/bin/chromium python3 stats/test/games.py
```

Omit `CHROMIUM` to use Playwright's bundled browser. `SITE_URL` overrides the local server URL and may include a site mount, such as `http://127.0.0.1:8001/jonniepeed-games`. The studio check uses controlled browser time and real pointer/keyboard/touch input; a response-only bridge checks hold timing, cancellation and canvas pixels without shipping test hooks. It covers shelf visibility/focus/tab order/accessibility, badges, hash/session restore, game round trips, denied storage, no-JavaScript fallback, themes, viewport sizes and reduced motion. `SCREENSHOTS` selects its screenshot directory (default `/tmp/studio-screenshots`); Stick Army has its own [validation details](docs/games/stick-army.md#validation-and-generated-assets).

## Balance bots

Stick Army has balance bots ([SPEC-005](specs/SPEC-005-balance-bots.md); see [the guide](docs/guides/01-balance-bots.md)). They play seeded runs headless at casual, decent and expert skill and report survival, causes of death, per-wave events and shop picks. Run them by hand; the runner serves `site/` itself:

```sh
python3 tools/balance/run.py stick-army --runs 200
python3 tools/balance/run.py stick-army --runs 200 --skills decent --ref main
```

Output goes to `work/balance/` (git-ignored). A tuning PR for an opted-in game includes a before/after summary for at least the decent profile. Bots measure difficulty, not fun; playtesting wins.

## Trailers

Don't Step on a Crack and Thimbleful have 15- and 16-second trailers ([the guide](docs/guides/04-trailers.md)). It's cut from real play: a scripted player plays seeded takes under a fake clock, every frame is captured, and the game's own sound is re-rendered from what it played. Dry-run the takes first; it's quick and plays exactly like the filmed run:

```sh
python3 tools/trailer/make.py dont-step-on-a-crack --dry
python3 tools/trailer/make.py dont-step-on-a-crack
```

Output goes to `work/trailer/` (git-ignored). Trailer videos stay out of the repo, so clones and deploys stay light: post the cut from `work/trailer/<slug>/trailer.mp4` to YouTube and social platforms. The same command rebuilds the exact cut from the repo.

## Social previews

Each page has Open Graph and Twitter tags pointing at a 1200×630 game card at `site/<slug>/og.png` or the generic studio card at `site/assets/studio/og.png`. Shelf thumbnails live at `site/<slug>/thumb.png` (pixel canvas) or `thumb.webp` (cover art or page screenshot). A game with cover art in `brand/covers/` uses one 4:3 crop of it for both: the 768×576 thumbnail, and the picture on its card, where the card leaves out the title because the cover has it lettered in. [02: Cover art](docs/guides/02-cover-art.md) explains how to make one. Image URLs must be absolute, so they point at the GitHub Pages copy (`https://jonniepeed.games/`). Page `og:url` values use the clean trailing-slash URL. Run the Pages workflow at least once so those images exist. To use another domain, find and replace that base URL in the pages.

Rebuild the cards and index thumbnails after changing a game's art or adding a game (add it to `GAMES` in the script first):

```
python3 tools/og/make.py
```

## Caching

Every local script, stylesheet and image link carries `?v=<content hash>`, so a changed file gets a new URL and browsers fetch it fresh on a normal reload. After editing anything in `site/`, run:

```
python3 tools/stamp.py
```

The Pages workflow runs it too. Run it before publishing to Arweave.

## Hosting

- DNS for `jonniepeed.games` is on Cloudflare: apex A records point to GitHub Pages and `www` is a CNAME to `jonniesparkles.github.io`, all **DNS only**.
- The Pages custom domain is set in repository settings. Pages deploys through the custom workflow; no `CNAME` file is needed.
- The `jonniepeed-games-scores` Worker uses a Cloudflare Custom Domain at `scores.jonniepeed.games`.
- The `jonniepeed-games-stats` Worker uses a Cloudflare Custom Domain at `stats.jonniepeed.games`. Its `/dash` path sits behind Cloudflare Access.
- `games.sparklelabs.org` redirects to the new domain through a Cloudflare redirect rule.

Nothing has been uploaded to Arweave yet. From the first Arweave upload onward, the scores address in `site/assets/leaderboard.js` is baked into immutable copies, so `scores.jonniepeed.games` becomes permanent at that point, along with the API version those copies call.

## Publishing to GitHub Pages

Manual only, like the leaderboard Worker deploy below; don't add automatic triggers to either workflow. The play stats Worker is the one exception: it deploys itself (below). In the Actions tab, open "Deploy to GitHub Pages" and click Run workflow. It publishes the `site/` folder.

## Backend services

Each backend service is a Cloudflare Worker in its own top-level folder, named the same way everywhere:

| | Pattern | Leaderboards | Play stats |
| --- | --- | --- | --- |
| Repo folder | `name/` | `scores/` | `stats/` |
| Worker and D1 database | `jonniepeed-games-name` | `jonniepeed-games-scores` | `jonniepeed-games-stats` |
| Address | `name.jonniepeed.games` | `scores.jonniepeed.games` | `stats.jonniepeed.games` |

The feature itself can have a friendlier name in docs and buttons (leaderboards, play stats). New `*.jonniepeed.games` addresses do not automatically need CAA records of their own: the apex uses A records to GitHub Pages, so CAA lookup inherits the apex policy without following a GitHub CNAME. Only `www` is a CNAME. If CAA restricts issuance, the applicable policy must allow Cloudflare's certificate authorities (`pki.goog`, `letsencrypt.org`, `ssl.com`). Check closer records and any CNAME target before adding an override; see the [leaderboard guide](docs/guides/00-leaderboards.md#if-the-scores-certificate-wont-issue).

## Deploying the Leaderboard Worker

Manual only, and only after changes in `scores/`. In the Actions tab, open "Deploy Leaderboard Worker" (it deploys `scores/`) and click Run workflow, or run `wrangler deploy` from `scores/`. Scores in the database are never touched. One-time secrets setup is in the leaderboard guide: the workflow's GitHub secrets under [Deploying the Worker](docs/guides/00-leaderboards.md#deploying-the-worker), and the Worker's own `RUN_SECRET` under [One-time setup](docs/guides/00-leaderboards.md#one-time-setup-jonnies-cloudflare-account).

## Deploying the Play Stats Worker

Automatic: when a change to `stats/` reaches `main`, the "Deploy Play Stats Worker" workflow runs by itself (tests first, then a check of the live Worker). It's the only automatic deploy; its changes are private dashboards and per-game switches, so a manual step would only add a chance to forget. It can also be run from the Actions tab, or with `wrangler deploy` from `stats/`. Runs in the database are never touched. It uses the same GitHub secrets as the leaderboard Worker; the one-time setup (database, Cloudflare Access and its two Worker secrets) is in [03: Play stats](docs/guides/03-play-stats.md#one-time-setup-jonnies-cloudflare-account).

## Publishing to Arweave / ArNS

Arweave publishing is paused until a follow-up confirms the uploader and adds whatever manifest support it needs. This layout change adds no manifest generator. Publishing and ArNS updates remain manual.

The new layout requires a path manifest (`manifest: "arweave/paths"`, version `0.1.0`) with:

- Root `index: {"path": "index.html"}` and an `index.html` entry pointing to the uploaded studio page.
- Exact, case-sensitive paths for every published file relative to `site/`, including moved images, fonts and scripts; no leading slash or `site/` prefix. Upload only `site/`; `brand/` stays out.
- Every game folder's physical `<slug>/index.html` entry plus a `<slug>/` entry pointing to **the same transaction ID**. Include unlisted Stick Army; discover game folders rather than using shelf membership. Preserve the trailing slash. No slashless `<slug>` entries, old paths, duplicate uploads or missing-asset fallback to HTML.

In the follow-up, confirm the uploader and receipt format, add any needed support, and validate missing IDs, collisions and exact asset paths. Run stamp before uploading files and build a fresh manifest from those exact upload receipts; upload the manifest with `application/x.arweave-manifest+json`. Test all clean game/home links, assets and `#tune` through an ar.io gateway at a manifest-ID mount and an ArNS root where available. Record the test manifest ID, gateway base URL and results before manually updating the production ArNS pointer. The gateway acceptance check is deferred to that follow-up. Old Arweave copies remain immutable history.

## License

Code is MIT. The JonniePeed Games name, logo and mark are not covered by it; see [LICENSE](LICENSE).
