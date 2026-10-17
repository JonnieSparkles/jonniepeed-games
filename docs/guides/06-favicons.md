# 06: Favicons

Every JonniePeed Games game has its own favicon. It's the icon in the browser tab, in bookmarks and history, and on a phone's home screen when someone adds the game there. People leave games open in a tab and come back to them, so the tab should show the game, not the studio mark. The studio page and `404.html` keep the shared studio icons in `site/assets/`.

Everything below is a default, not a rule. If breaking one makes a better icon, break it.

## What makes a good favicon

**One glyph, not a scene.** At 16 px there's room for one idea: a bull's head, a chute, a drip over a sprout, two dots about to meet. Cover art and share cards don't survive being shrunk, so draw the icon fresh instead of scaling a picture down.

**The game's own look.** Take the colors and details from the game's code and art, not from memory: Stick Army's chute and ink, the shades both Unruggabulls wear. A pixel game gets pixel art; a notebook game gets ink line art.

**A clear silhouette.** A filled background behind the glyph keeps it readable in both light and dark tab strips. A light icon needs a darker edge so it doesn't melt into a light tab bar.

**Related games stay apart.** Unruggabull II and Remastered share the bull, so they differ in the bull's color and the background: the black bull in the fire for II, the brown bull on the alley's night red for Remastered. Someone with both open should know which tab is which without reading the titles.

**Some excitement.** A plain face is easy to miss. A small character detail, like shades with a glint or embers in the corners, makes the tab feel like the game.

## Size and format

- Draw `brand/favicons/<slug>.png` at 16×16, **full bleed**: fill every pixel, corners included. The tool rounds the corners off for the tab icons and keeps the square for the home-screen icon, which iOS rounds itself.
- The 16 px art is what most tabs show, and the tool never makes it by shrinking something bigger, so draw it by hand.
- If a detail only fits at 32 px, add `brand/favicons/<slug>-32.png` at 32×32. Most screens now show the 32 px icon, so it can carry more than the 16 px one. Stick Army's rifle only appears at 32 px; at 16 px it turned into clutter. Without a 32 px file, the tool doubles the 16 px art.

## Making one

1. Draw the source in any pixel editor and save it as `brand/favicons/<slug>.png` (and `<slug>-32.png` if needed).
2. Build it: `python3 tools/favicons/make.py --game <slug>`. It writes `favicon.ico` (16 and 32 px), `favicon-32.png` and a 180 px `apple-touch-icon.png` into `site/<slug>/`, and refuses a source that is the wrong size or has transparent pixels.
3. Link them from the game's `index.html`, relative to its folder:

   ```html
   <link rel="icon" href="favicon.ico" sizes="any">
   <link rel="icon" type="image/png" href="favicon-32.png">
   <link rel="apple-touch-icon" href="apple-touch-icon.png">
   ```

4. Run `python3 tools/stamp.py` last, so browsers pick up the new icons instead of a cached one.
5. Say what the icon shows in the game's own doc, `docs/games/<slug>/README.md`, beside its share card and thumbnail.

## Final check

Open the game with several other tabs, in a light and a dark browser theme. It should be recognisable at a glance without reading the title, and different from every other game's tab. If it isn't, simplify it.
