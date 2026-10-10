# Don't click this

An unlisted proof of concept for playing together over the internet. Two phones, anywhere: one starts a match and sends the link, the other opens it, and each sees the other's dot moving live. When the two dots touch, both phones burst at once: "WE DID IT".

- Page: `site/dont-click-this/` (`index.html`, `audio.js`, `game.js`), noindexed. **Unlisted:** no card on Side A or Side B; reached only by its direct link, https://jonniepeed.games/dont-click-this/. It still has an `og.png` so a texted link shows a preview; `tools/og/make.py` also writes a `thumb.webp`, unused until it gets a card.
- Connection: the rooms Worker, [05: Rooms](../guides/05-rooms.md).
- Test: `tests/dont-click-this/test.py`.
- No online scores or play stats.

## How it plays

1. **Title card:** "Don't click this." and **Start a match**.
2. **Start a match** asks "What's the secret?" with three buttons: Meatball and two random decoys, in random order. The secret is always a meatball. The room checks the answer (it isn't in the page); a wrong pick shakes the card, says "Nope. That's not the secret." and deals new decoys.
3. **The right pick** makes a 12-character code, puts it in the page's `#`, and shows the share card: the link, **Send link** (the phone's share sheet; copies the link where there is none), **Copy link**, and "Waiting for your friend…".
4. **The friend opens the link** and needs no secret. It joins straight away. Both phones play the join sound and buzz, show "Friend is here!", and the Friend label lights up. The hint reads "Drag your dot into theirs".
5. **Each player drags their own dot** (blue, "you"). The friend's dot is orange, with a short trail and a dashed line between the two. A ring pulses around a dot while its player is touching the screen. Arrow keys move the dot on a keyboard.
6. **Touching dots** burst on both phones. The first time: "WE DID IT", "Two phones. One page. Across the internet.", a big burst and a buzz. After that, a count ("×2"). The dots have to move apart again before the next one counts.
7. **The top bar** shows both players, and "~N ms apart" once both have measured their round trip: half of each phone's round trip to the room, added together.
8. **If the friend leaves:** "Friend left" and "They can come back with the same link". Their dot fades where it was. The same link brings them back.
9. **A third phone** with the link sees "This match is full" and can start its own.
10. **A made-up link**, or one more than a week old, says "This match isn't open".
11. **A dropped connection** (wifi to mobile data, a locked phone) reconnects on its own and keeps its seat; returning to the page reconnects at once.

## Layout and tuning (`game.js`)

- The play area is a square, `min(width − 32, height − 120)`, centered a little low. Positions are shares of the square (0 to 1), so phones of any shape agree on where a dot is.
- `R = 0.05`: dot radius. Dots touch at `2R` and re-arm beyond `5R`.
- Starting spots: seat 1 at (0.28, 0.5), seat 2 at (0.72, 0.5).
- Positions go out at most about 30 times a second; the other phone eases toward each one (`1 − e^(−18·dt)`).
- Messages: `{"t":"p","x","y","d","r"}` (position, finger down, round trip in ms) and `{"t":"boom"}`. Either phone can detect the touch; the other plays it on `boom` unless it already did within 0.8 s.
- Rooms: `ws://localhost:8788` on `localhost` and `127.0.0.1`, otherwise `wss://rooms.jonniepeed.games`.

## Sound and feel

`audio.js` (`DontClickSound`: `init`, `play(name)`, `toggle`, `muted`) synthesizes four sounds: `join` (rising arpeggio), `leave`, `boom` (bigger the first time) and `tap`. Audio starts on the first tap; the friend who opens a link hears sounds from their first touch. Mute is saved on the device. Phones that support it buzz on join and on each touch.

Full screen uses the Fullscreen API where it exists (F on a keyboard); the button is hidden where it doesn't (iPhone), since the page already fills the window. M mutes.

## Validation

Start the site server and a local rooms Worker (see the guide), then:

```sh
CHROMIUM=/usr/bin/chromium python3 tests/dont-click-this/test.py
```

It plays a whole match with two phone-sized browsers: a wrong secret, then Meatball, the share link, join, a drag seen on the other phone, "WE DID IT" on both, the ms readout, a made-up link refused, a third phone turned away, leaving and rejoining, and landscape and desktop layouts. Screenshots go to `/tmp/dont-click-this` (`SCREENSHOTS` changes it).
