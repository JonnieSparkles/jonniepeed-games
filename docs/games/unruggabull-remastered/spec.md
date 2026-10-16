# Unruggabull: RugCo Alley Remastered

**Status:** built (Oct 16, 2026), unlisted. The living doc is [README.md](README.md). The share card is the poster mockup (card 1) with "Now on mobile", Jonnie's pick.

A remaster of the 2025 game, [Unruggabull: RugCo Alley](https://github.com/jonnieSparkles/unruggabull-the-game) (v0.1.0, still live at [unruggabull.ar.io](https://unruggabull.ar.io)), at `jonniepeed.games/unruggabull-remastered/`. The 2025 copy stays where it is as the original.

## Why

Phones couldn't play it (they got a "meant for desktop" gallery), and it feels old.

## Decided (Jonnie, Oct 16)

- **Faithful, with touches.** Same alley, same waves, same Rugfather, same numbers, same art, sound and voice lines. The touches are presentation: fonts, HUD, platforms, banners, title, end card.
- **Nothing of Unruggabull II's style.** No p(Loom), souls, strip cards, Silkscreen or Pixelify Sans, elevator picker. Leaderboards and other site services are fine.
- **Landscape only.** On a phone held upright the game waits on a "turn your phone sideways" screen.
- **Full height**, as the original: the 960 × 540 alley keeps its 16:9 at the window's full height, and the extra width of a phone becomes dark bars where the controls sit.
- **Controls.** A d-pad on the left: left and right walk, up and the up-diagonals jump (once per press, with a short buffer before landing), down crouches. The right half of the screen is Fire, one shot per tap as on the keyboard, with a big Fire button showing where the thumb goes. No Jump button. A pause button with Resume and Quit.
- **Title screen: B, the poster.** The RugCo Empire painting with a slow push-in, firelight and rising embers, the tagline, a new wordmark and a menu: Play, Leaderboard, Gallery, Credits and a link to the 2025 original.
- **The board.** Fastest clear from Start to the Rugfather's defeat; health breaks ties. Unrugged shows as a third column (75 reaches the Rugfather, and the carpshits he calls in during the fight count too, so it varies). A heart marks a clear at full health; since Oct 16, it is one of three medals beside the name (Flawless, Under 2:00, Never ran dry), Jonnie's call to show them on the board. A rugged run doesn't go on the board.
- **Name:** Unruggabull: RugCo Alley Remastered. Unlisted and noindexed until Jonnie has played it on his phone.

Mockups: https://claude.ai/artifact/FZnKbcDX9AeMxpQDL13LYh

## Steps (one branch, one pull request)

1. **The original on phones, in its 2025 look.** The code moved into the site's classic scripts; a fixed 60-steps-a-second game clock (a 120 Hz phone ran the 2025 game twice as fast); full-height layout; touch controls; pause; the portrait screen; full screen; sound through Web Audio; assets shrunk from about 40 MB to about 6 MB.
2. **The touched look and title B**, with the link to the 2025 original.
3. **The end card**: time, health and unrugged, initials and the board (on the device first, then online).
4. **The share card and site card** (1200 × 630 and 4:3), and the games-page entry when it's listed.
