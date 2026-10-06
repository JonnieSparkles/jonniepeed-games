# Jonniepeed Games

Small browser games and pixel scenes. Plain static files, no build step.

## Layout

```
site/                   everything that gets published
  index.html            studio page: logo, pixel ident, game shelf
  thimbleful/           catch-the-drips game (phone or desktop)
  windowsill/           animated pixel scene
  assets/               logo, pixel mark, thumbnails, favicons, ident.js
  assets/fonts/         Silkscreen and Pixelify Sans (SIL OFL), self-hosted
  favicon.ico
tools/og/make.py        builds the social preview cards
brand/                  source logo files, not published
  logo.png, logo-dark.png         full logo, transparent, light and dark versions
  mark.png, mark-dark.png         stick figure mark
  mark-pixel*.png                 pixel-art mark (1x and 8x)
  icon-192.png, icon-512.png, apple-touch-icon.png, favicon.ico
  logo-animated.mp4               animated logo, 6s, no audio (for social posts)
```

Unruggabull lives in its own repo and is linked from the shelf at https://unruggabull.ar.io.

## Adding a game

1. Make a folder in `site/` with an `index.html` that only uses relative paths.
2. Add a 4:3 thumbnail to `site/assets/` (pixel art: 96×72 scaled 4× with nearest-neighbour).
3. Copy one of the cards in `site/index.html` and point it at `yourgame/index.html`.

## Social previews

Each page has Open Graph and Twitter tags pointing at a 1200×630 card in `site/assets/og/`. Image URLs must be absolute, so they point at the GitHub Pages copy (`https://jonniesparkles.github.io/jonniepeed-games/`). Run the Pages workflow at least once so those images exist. To use another domain, find and replace that base URL in the three pages.

Rebuild the cards after changing a game's art or adding a game (add it to `GAMES` in the script first):

```
python3 tools/og/make.py
```

## Publishing to GitHub Pages

Manual only. In the Actions tab, open "Deploy to GitHub Pages" and click Run workflow. It publishes the `site/` folder.

## Publishing to Arweave / ArNS

- Upload the `site/` folder as one path manifest with `index.html` as the index. `brand/` stays out.
- Links point at `folder/index.html` explicitly, because manifest paths are exact and `folder/` on its own may not resolve.
- Everything, fonts included, is served from the folder, so nothing depends on a third-party CDN.

## License

Code is MIT. The Jonniepeed Games name, logo and mark are not covered by it; see [LICENSE](LICENSE).
