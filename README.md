# JonniePeed Games

Small browser games and pixel scenes. Plain static files, no build step.

## Layout

```
site/                   everything that gets published
  index.html            studio page: logo, game shelf, pixel easter egg (assets/ident.js)
  thimbleful/           catch-the-drips game, with a "Just watch" mode (#watch)
  dont-step-on-a-crack/  first-person sidewalk game; title screen runs a demo walk, Mom Cam in the HUD
  assets/               logo, ident.js, pixel mark, thumbnails, favicons, preview cards
  assets/fonts/         Silkscreen, Pixelify Sans, Cabin Sketch, Atkinson Hyperlegible, IBM Plex Mono (SIL OFL)
                        and Schoolbell (Apache 2.0), self-hosted
  favicon.ico
tools/og/make.py        builds the social preview cards (pixel canvases, or page screenshots for smooth games)
tools/stamp.py          adds ?v=<hash> to file links so updates aren't stuck in browser caches
tools/check_boards.py   checks game BOARD constants before deploying
scores/                Cloudflare Worker, D1 schema, rules and API tests (not published with site/)
specs/                  build specs, one file each: SPEC-001-name.md, SPEC-002-name.md, ...
docs/guides/            operating guides, one file each: 00-name.md, 01-name.md, ...
brand/                  source logo files, not published
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
- **Cache busting.** Run `python3 tools/stamp.py` after any change in `site/`, so changed files get new `?v=` links.
- **Social previews.** Every page has Open Graph and Twitter tags and a 1200×630 card. Rebuild with `python3 tools/og/make.py`. The index card stays generic and never lists games.
- **Relative links, explicit `index.html`.** Needed for Arweave manifests.
- **No backward compatibility.** Remove old pages and paths outright, with no redirects or shims.
- **Online scores.** Games with scores follow [the leaderboard guide](docs/guides/00-leaderboards.md). The scores API is the one exception to no backward compatibility: old published copies must keep working.
- **Related, not identical.** Reuse what the other games already do (full screen, leaderboards, previews) so nothing starts from scratch, but each game is free to do things its own way.
- **Spelling.** The studio is JonniePeed Games (capital P). Lowercase `jonniepeed` only in slugs and URLs.

## Adding a game

1. Make a folder in `site/` with an `index.html` that only uses relative paths, following the standards above.
2. Add it to `GAMES` in `tools/og/make.py` and run it to make its preview card and index thumbnail.
3. Copy one of the cards in `site/index.html` and point it at `yourgame/index.html`.
4. Run `python3 tools/stamp.py`.
5. For online scores, follow the [Adding a game checklist](docs/guides/00-leaderboards.md#adding-a-game) in the leaderboard guide; deploy the Worker before the site.

## Social previews

Each page has Open Graph and Twitter tags pointing at a 1200×630 card in `site/assets/og/`. Image URLs must be absolute, so they point at the GitHub Pages copy (`https://jonniesparkles.github.io/jonniepeed-games/`). Run the Pages workflow at least once so those images exist. To use another domain, find and replace that base URL in the pages.

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

## Publishing to GitHub Pages

Manual only. In the Actions tab, open "Deploy to GitHub Pages" and click Run workflow. It publishes the `site/` folder.

## Backend services

Each backend service is a Cloudflare Worker in its own top-level folder, named the same way everywhere:

| | Pattern | Leaderboards |
| --- | --- | --- |
| Repo folder | `name/` | `scores/` |
| Worker and D1 database | `jonniepeed-games-name` | `jonniepeed-games-scores` |
| Address | `name.games.sparklelabs.org` | `scores.games.sparklelabs.org` |

The feature itself can have a friendlier name in docs and buttons (leaderboards). Every new `*.games.sparklelabs.org` address needs three CAA records of its own, or its certificate won't issue: `games.sparklelabs.org` points to GitHub Pages, whose CAA records don't allow Cloudflare's certificate authorities. The [leaderboard guide](docs/guides/00-leaderboards.md#if-the-scores-certificate-wont-issue) has the records and the fix.

## Deploying the Leaderboard Worker

Manual only, and only after changes in `scores/`. In the Actions tab, open "Deploy Leaderboard Worker" (it deploys `scores/`) and click Run workflow, or run `wrangler deploy` from `scores/`. Scores in the database are never touched. One-time secrets setup is in the [leaderboard guide](docs/guides/00-leaderboards.md#deploying-the-worker).

## Publishing to Arweave / ArNS

- Upload the `site/` folder as one path manifest with `index.html` as the index. `brand/` stays out.
- Links point at `folder/index.html` explicitly, because manifest paths are exact and `folder/` on its own may not resolve.
- Everything, fonts included, is served from the folder, so nothing depends on a third-party CDN.

## License

Code is MIT. The JonniePeed Games name, logo and mark are not covered by it; see [LICENSE](LICENSE).
