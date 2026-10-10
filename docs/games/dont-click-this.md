# Don't click this

An unlisted proof of concept for playing together over the internet. Up to four phones, anywhere: one starts a match and sends the link, friends open it, and each sees everyone's dots moving live. When two dots touch they burst ("WE DID IT" the first time), and when three or four pile up together, every phone goes off: "EVERYONE!".

- Page: `site/dont-click-this/` (`index.html`, `audio.js`, `game.js`), noindexed. **Unlisted:** no card on Side A or Side B; reached only by its direct link, https://jonniepeed.games/dont-click-this/. It still has an `og.png` so a texted link shows a preview; `tools/og/make.py` also writes a `thumb.webp`, unused until it gets a card.
- Connection: the rooms Worker, [05: Rooms](../guides/05-rooms.md).
- Test: `tests/dont-click-this/test.py`.
- No online scores or play stats.

## How it plays

1. **Title card:** "Don't click this." and **Start a match**.
2. **Start a match** asks "What's the secret?" with three buttons: Meatball and two random decoys, in random order. The secret is always a meatball. The room checks the answer (it isn't in the page); a wrong pick shakes the card, says "Nope. That's not the secret." and deals new decoys.
3. **The right pick** makes a 12-character code, puts it in the page's `#`, and shows the share card: "Send this to friends", the link, **Send link** (the phone's share sheet; copies the link where there is none), **Copy link**, and "Waiting for your friend…".
4. **A friend opens the link** and needs no secret. It joins straight away. Every phone plays the join sound and buzzes, and shows "Orange is here!" (or "2 friends are here!" for someone joining a match already going). Later arrivals show "Green joined" and "3 of you now."
5. **Seats and colors.** Each phone gets a seat in the order they join, and a seat keeps its color on every phone: 1 Blue, 2 Orange, 3 Green, 4 Pink. The top bar shows a dot for each player, with yours ringed and marked "You"; someone who left stays there, faded. Dots are named under them ("you", "orange"…); a name that would sit on top of another is left out.
6. **Each player drags their own dot.** Friends' dots have a short trail and a dashed line to yours. A ring pulses around a dot while its player is touching the screen. Arrow keys move the dot on a keyboard.
7. **Touches.** Your dot touching a friend's bursts in both colors. The first time: "WE DID IT", "Different phones. One page. Across the internet.", a big burst and a buzz. After that, a count ("×2"). Two friends touching each other shows a smaller burst on your screen. A pair has to move apart before it counts again.
8. **Pile-up.** With three or four in the match, everyone crowding into one spot at once sets off "EVERYONE!" and "N phones. One pile." on every phone, with the biggest burst and buzz. Spread out to set it up again.
9. **Invite.** While fewer than four are playing, an **Invite** button in the top bar shows the share card again, with **Back to the game**.
10. **The bottom line** shows the hint and "~N ms apart": your half of the round trip to the room plus the slowest friend's half.
11. **If someone leaves:** "Green left" and "They can come back with the same link". Their dot fades where it was. The same link brings them back ("Green is back").
12. **A fifth phone** with the link sees "This match is full" and can start its own.
13. **A made-up link**, or one more than a week old, says "This match isn't open".
14. **A dropped connection** (wifi to mobile data, a locked phone) reconnects on its own and keeps its seat; returning to the page reconnects at once.

## Layout and tuning (`game.js`)

- The play area is a square, `min(width − 32, height − 120)`, centered a little low. Positions are shares of the square (0 to 1), so phones of any shape agree on where a dot is.
- `R = 0.05`: dot radius. Two dots touch at `2R` and re-arm beyond `5R`. A pile-up is every player within `2.5R` of their middle; it re-arms once someone is beyond `6R`.
- `SEAT`: each seat's name, color and starting spot: Blue (0.28, 0.5), Orange (0.72, 0.5), Green (0.5, 0.28), Pink (0.5, 0.72). `SEATS = 4` matches the room's limit.
- Positions go out at most about 30 times a second; other phones ease toward each one (`1 − e^(−18·dt)`).
- Messages, each tagged with the sender's seat `f` by the room: `{"t":"p","x","y","d","r"}` (position, finger down, round trip in ms), `{"t":"boom","w":seat}` (my dot touched seat w's) and `{"t":"all"}` (pile-up). Each phone judges its own dot's touches and its own view of a pile-up, and tells the others; a phone plays a touch unless it already did for that pair within 0.8 s, and a pile-up unless it already did within 2 s. A "×N" count doesn't cover "EVERYONE!".
- Rooms: `ws://localhost:8788` on `localhost` and `127.0.0.1`, otherwise `wss://rooms.jonniepeed.games`.

## Sound and feel

`audio.js` (`DontClickSound`: `init`, `play(name)`, `toggle`, `muted`) synthesizes four sounds: `join` (rising arpeggio), `leave`, `boom` (bigger for the first touch and a pile-up) and `tap`. Audio starts on the first tap; a friend who opens a link hears sounds from their first touch. Mute is saved on the device. Phones that support it buzz on joins, on their own touches and on a pile-up.

Full screen uses the Fullscreen API where it exists (F on a keyboard); the button is hidden where it doesn't (iPhone), since the page already fills the window. M mutes.

## Validation

Start the site server and a local rooms Worker (see the guide), then:

```sh
CHROMIUM=/usr/bin/chromium python3 tests/dont-click-this/test.py
```

It plays a whole match with phone-sized browsers: a wrong secret, then Meatball, the share link, a second phone joining, a drag seen on the other phone, "WE DID IT" on both, the ms readout, a made-up link refused, Invite and Back, third and fourth phones joining (everyone sees four), a fifth turned away, all four piling up for "EVERYONE!" on every phone, leaving and rejoining, and landscape and desktop layouts. Screenshots go to `/tmp/dont-click-this` (`SCREENSHOTS` changes it).
