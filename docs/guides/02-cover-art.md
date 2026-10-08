# 02: Cover art

Every JonniePeed Games game gets a box-art cover. It is the game's shelf thumbnail on the studio page and the picture on its share card. The title screen stays the game itself, so the cover is free to promise more than the screen shows: a bigger world, more drama, a little mystery. Together they give you both.

Everything below is a default, not a rule. If breaking one makes a better cover, break it.

## What makes a good cover

**One hero moment.** Pick the single image that would make someone click, and build out from it. It should read at a glance, even at 300 px wide on a phone. Everything else gets smaller, fainter or further back. A busy cover is fine as long as one thing clearly comes first. It becomes cluttered when five things compete for that spot.

**The game's own medium.** A notebook doodle game gets ballpoint pen on lined paper. A pixel game gets pixel texture. A painted game gets paint. The covers should not look like one illustrator made them all. The look is part of each game's identity.

**Recognisable, not literal.** Keep the game's palette, its key characters and props, and its joke. Scenery, scale, camera and drama are yours to invent. Stick Army's helmeted squad, concrete bunker and pine hills aren't in the game, and the cover is better for them.

**The title is lettered into the world.** Ask how the title would physically exist in that game's world, and avoid reusing another cover's treatment. Make it bigger than feels necessary at full size, because it has to read on the phone shelf. Check the spelling.

**Heighten the tone, don't darken it.** Stick Army can look like total war, but the blood is red-ink splats. Don't Step on a Crack can make a crack look menacing, but it stays absurd. Thimbleful's can can loom, but the world stays cozy.

**Leave something to find.** Smaller enemies, props and jokes reward a second look, as long as they don't compete with the hero.

## Size and crop

- Make the master 1536×1024 landscape. That's what image models usually produce, and any 3:2 image works.
- The site takes one 4:3 crop of it, 1365×1024 from a 1536-wide master. The same crop becomes the 768×576 shelf thumbnail and the picture on the 1200×630 share card. The card adds the studio line, the tagline and "Play in your browser" beside the picture, and leaves out the title because the cover already has it.
- Keep the title, the hero and anything the joke depends on inside a 4:3 area. The Mom Cam is the example: it sits in a corner, so that crop is shifted to keep it in. The far left and right edges are for atmosphere.

## Warning signs

When a cover feels generic, it has usually drifted toward one of these:

- glossy, cinematic lighting
- several things of equal size and detail competing to be first
- the same finish as another cover on the shelf
- a title that's too small to read at 300 px, or misspelled
- characters redesigned until the joke is gone

The fix is usually to go back to the game and add constraints, not remove them.

## Final check

Shrink the cover to about 300 px wide, ideally on the shelf next to the other covers, and ask:

- Can you read the title?
- Can you tell what you'd be doing?
- Is the look clearly this game's medium?
- Does it look too much like another cover?
- Is everything that matters inside the 4:3 crop?

If the first read takes more than a second or two, simplify.

## Making one

1. Look at the game first: its `docs/games/<slug>.md`, its current `site/<slug>/og.png` and title screen, and its drawing code for colours and characters.
2. Brief an image model with the prompt below, and attach a screenshot or the current `og.png` as a reference.
3. Iterate in the same chat. The usual asks are "make the title bigger", "one hero moment, thin out the rest", and "move that inset away from the corner".

```
Cover art for <GAME>, a small browser game by JonniePeed Games. Compose it like old-school box art from an 80s or 90s cartridge box or arcade cabinet: one dramatic hero moment, with the action pushing toward the viewer.

The game: <one or two sentences: what you do, who's in it, the joke>.
Hero moment: <the one image that sells it>.
Smaller and further back: <enemies, props, jokes>.
Medium: <the game's own look, e.g. ballpoint pen doodle on lined notebook paper>, in the game's palette: <colours>.
Title: "<TITLE>", lettered into the world as <treatment>, big enough to read at 300 px wide. Spell it exactly.
Tone: <e.g. playful; red-ink splats, not gore>.
Size: 1536×1024 landscape. Keep the title and the hero inside the central 4:3 area (about 1365×1024), because the sides get cropped. Make it clearly different from the other covers: <their mediums and title treatments>.
```

## Adding it to the site

1. Save the full-size image as `brand/covers/<slug>.png`. It isn't published.
2. In `tools/og/make.py`, give the game's `GAMES` entry `None, {"cover": ("<slug>.png", 0.5)}` in place of its capture setup and options. The number places the crop: `0` is the left edge, `0.5` is centred and `1` is the right edge.
3. Run `python3 tools/og/make.py --game <slug>`. It writes `site/<slug>/thumb.webp` and `site/<slug>/og.png`. If the game had a `thumb.png` before, delete it and point the shelf `<img>` in `site/index.html` at `thumb.webp`, sized 768×576.
4. Update the alt text on the shelf image and the page's `og:image:alt` and `twitter:image:alt`, plus the line in the game's doc that says where its card comes from.
5. Look at the card and the thumbnail yourself, then run `python3 tools/stamp.py` last.

## Covers so far

| Game | Medium | Title | Hero | Crop |
| --- | --- | --- | --- | --- |
| Stick Army | ballpoint on lined notebook paper | hand-lettered in pen, STICK in blue and ARMY in red | the turret blasting into the sky, a trooper landing on the trampoline | centred |
| Don't Step on a Crack | painted sidewalk, seen from above | chalked on the slab, with the crack running through CRACK | your sneakers at the crack, Mom glaring from the Mom Cam | `0.18`, to keep the top-left Mom Cam |
| Thimbleful | painterly, with pixel texture | a cross-stitch sampler with needle and thread | the explorer holding up her thimble under the sly watering can | centred |

Unruggabull lives in its own repo, and its shelf thumbnail is already title art.
