# 05: Rooms

Rooms let friends play a game together over the internet from a link. One player starts a match and texts the link; whoever opens it is in. No accounts, no app, nothing to install. It runs on Cloudflare's free plan.

There are two parts:

- **The rooms Worker** (`rooms/`, at `rooms.jonniepeed.games`). It seats players, says who the host is and passes messages between phones. It knows nothing about any game, so a new game never needs a change here.
- **`site/assets/rooms.js`**, the page side. It connects, stays connected (pings, reconnects after a drop or a locked phone, keeps a player's seat across a reload) and turns the room into events. A game uses it and writes only its game.

[Don't click this](../games/dont-click-this.md) is the first game on it.

## Quick start

```html
<script src="../assets/rooms.js"></script>   <!-- before game.js -->
```

```js
// Starting a match: makes a code, puts it in the page's link (after the #) and connects.
const room = Rooms.open({ game: 'my-game', max: 2, secret: 'meatball' });
// Opened from a friend's link: joins the match in the link (null if there isn't one).
const room = Rooms.join({ game: 'my-game' });

room.on('ready', ({ seat, host, players }) => { /* connected: I'm `seat` */ });
room.on('join', seat => { /* someone arrived (or came back) */ });
room.on('leave', seat => { /* someone left */ });
room.on('host', seat => { /* the host changed; room.isHost says if it's me */ });
room.on('message', (msg, from) => { /* msg is whatever `from` sent */ });
room.on('refused', reason => { /* 'full', 'nope' (wrong secret), 'closed' (link not open), 'wrong-game', 'replaced' */ });

room.send({ t: 'aim', x: 0.4 });           // everyone else
room.sendTo(2, { t: 'state', ... });       // one seat
Rooms.share({ url: room.link, text: 'Play with me' });   // the phone's share sheet, or copy
```

Starting a match takes the secret (below), so a game asks for it before calling `Rooms.open`; joining from a link never does.

## Pick a pattern

The room only passes messages along. Keeping everyone's screens telling the same story is up to the game, and there are three usual ways. Pick by game type, not by limits: all three fit the room.

| | Each phone owns its own stuff | The host runs the game | Same game on every phone |
| --- | --- | --- | --- |
| What travels | Each phone's own state (my position, my score) | Others send input; the host sends the whole state | Only inputs, numbered by tick |
| Good for | Casual, physics-light games: Don't click this, drawing, racing your own ghost | Most action games; anything with lots on screen | Games already decided by a seed and inputs (Stick Army's runs are) |
| Hard part | Two phones disagreeing about a shared thing (decide who owns it) | The host has a small lead; guests see a slightly late picture | Every phone must calculate exactly alike (rules below) |
| Messages a second per phone | ~30 | Host ~20 snapshots; guests ~30 inputs | ~15 (batch a few ticks per message) |
| Free plan, 2 players | ~9 hours of play a day | ~11 hours | ~18 hours |
| Free plan, 4 players | ~4.5 hours | ~5 hours | ~9 hours |
| Data per guest phone | A few MB an hour | 70–140 MB an hour with 1–2 KB snapshots | A few MB an hour |

The free plan counts messages, not their size, so a 15 KB snapshot costs the same as a 50-byte input. Size costs players' mobile data instead: send snapshots only as often as the game needs, and only what changed if they're big.

### Each phone owns its own stuff

Each phone sends its own state; everyone draws everyone else's latest, easing toward it. For anything shared (a ball, a hit), give it one owner who decides and announces it. Don't click this does this: the phone whose dot touched another announces the touch.

### The host runs the game

`room.host` is the lowest occupied seat, and every phone agrees on it. The host runs the real game; the others send their input and draw the host's snapshots, easing between the last two. When the host leaves, the next seat becomes host (`host` event) and carries on from the latest snapshot it received, so every phone should keep it. A guest's own movement can be shown straight away and corrected by the next snapshot, so it doesn't feel late.

### Same game on every phone

Every phone runs the full game from the same seed and applies everyone's inputs at the same tick. Only inputs travel, so it's the lightest on data, but the copies must never drift apart.

1. The host picks the seed and sends it (`sendTo` a joiner, or `send` at the start).
2. The game advances in fixed ticks (say 60 a second). Each phone sends its inputs for tick `n` and applies everyone's at `n + delay`, with `delay` a little over the round trip (`room.rtt`), so inputs arrive in time. A few ticks of delay is usually fine; your own turret can still turn immediately on screen.
3. Every second or so the host sends a short checksum of the state (score, wall, wave, positions rounded). A phone whose checksum differs asks; the host replies with the full state via `sendTo`, and that phone loads it. So the game needs to be able to save and load its whole state.

**Rules that keep copies identical:**

- `+ - * /`, `%`, `Math.floor`, `round`, `abs`, `min`, `max` and, in practice, `Math.sqrt` give the same answer in every browser. `Math.sin`, `cos`, `tan`, `atan2`, `exp`, `log`, `pow`, `hypot` and `cbrt` may not: Safari's engine and Chrome's can differ in the last digit, and over a long run that's enough to drift. Use lookup tables or your own versions in the game's logic. Drawing can use anything.
- Random numbers come from the game's own seeded generator, never `Math.random`.
- Nothing about the screen (size, frame rate, time between frames) touches the game's logic, only the drawing.
- Process things in a fixed order (arrays, sorted by id), never in an order that depends on timing.

To check, run the same seed and inputs headless in Chromium and in WebKit (Safari's engine) and compare checksums at the end. Playwright can run both: `python3 -m playwright install webkit` works on your own computer and on GitHub Actions. (The cloud session can't download it.)

### Catching up a late joiner

The room keeps no game state, so the host catches a newcomer up: on `join`, the host sends that seat whatever it needs with `sendTo(seat, …)`, such as a snapshot, the seed and tick, or the score. Everyone else keeps playing. Messages can be up to 16 KB, enough for a full snapshot of a busy game.

## How the room works

- Each room is a Cloudflare Durable Object, named by the 8–32 character code (`a-z`, `0-9`) in the link. `Rooms.newCode()` makes 12 random characters, which can't be guessed.
- **Opening.** A room nobody has opened yet only opens with the secret: `meatball` (`SECRET` in `rooms/src/index.js`). The opener's page sets the room's size (`max`, 2–8; 4 if not given) and game name. They're kept for a week, then cleared; after that the link says it isn't open. The repo is public, so the secret keeps out passers-by, not anyone who reads the code. A real lock would be a Worker secret (`wrangler secret put`), typed in rather than picked.
- **Game name.** A page for a different game can't join (`wrong-game`), so a Pong link opened in another game's page fails clearly.
- **Seats.** Each phone gets the lowest free seat, or the seat it asks for when it's free (rooms.js asks for its previous seat, so a reload keeps your color). Seats are slots, not people: a seat someone left can go to someone new.
- **Host.** The lowest occupied seat. It's in every `hello`, `join` and `leave`, so all phones always agree.
- **Messages.** A phone sends a JSON object up to 16 KB. The room adds `f`, the sender's seat, and passes it to everyone else, or only to seat `to` if the message has one (a `to` that isn't a seat number is an error, never a broadcast). The room handles one message at a time, so all phones receive messages in the same order (a sender doesn't get its own back).
- **Errors** (too big, not JSON, not an object, bad `to`, too fast) go back to the sender only, as `{"t":"error","reason":…}`. rooms.js logs them to the console and emits `error`, so a mistake shows up while the game is being built.
- **Rate limit.** 120 messages a second per phone, with bursts up to 240. Extra messages are dropped (the sender is told once a second); a phone that keeps flooding is disconnected.
- **Leaving.** A phone that closes and comes straight back with the same identity (a reload, a wifi blip) keeps its seat, and nobody is told it left: the room waits 3 seconds before announcing a leave. A real leave shows up 3 seconds late.
- **Silent phones.** A phone that drops off without saying goodbye (lost signal, a phone that suspends the tab) can look connected for minutes. An active room lets go of anyone silent for 15 seconds (no ping, no message) and says so straight away. rooms.js pings every 2.5 s, and treats 8 s without an answer as a dead connection and reconnects. A page that's hidden (another app, a locked phone) reconnects when it's looked at again.
- **Reconnecting.** rooms.js keeps a random identity per match in the tab's session storage, and asks for its previous seat. Reconnecting with it replaces the old connection if the room still has one, and keeps the seat; rooms.js doesn't repeat a `join` for someone already there. If the room keeps letting a page go (it's sending too much), rooms.js backs off up to 30 s between tries. Opening the same match in a second tab with the same identity (a duplicated tab) replaces the first, which is told (`replaced`).
- **Sleeping.** Rooms use hibernatable WebSockets: a room sleeps between messages and pings are answered without waking it, so an idle room costs nothing.

### The wire format

For a game that doesn't use rooms.js (it should), or for debugging.

`wss://rooms.jonniepeed.games/room/<code>?me=<id>&game=<name>&s=<secret>&max=<n>&seat=<n>` (only `me` is needed to join). Text `ping` is answered `pong`. The room sends:

| Message | When |
| --- | --- |
| `{"t":"hello","seat","host","max","game","seats":[…],"others"}` | To a phone that just connected, with the seats already taken |
| `{"t":"join","seat","host"}`, `{"t":"leave","seat","host"}` | To everyone else |
| `{"t":"error","reason","limit"}` | To the sender of a bad message |
| anything with `"f"` | A message from seat `f` |

Close codes: 4001 full, 4002 replaced by the same identity, 4003 wrong secret or room not open, 4004 wrong game, 4005 too many messages, 4006 silent too long. A clean close is announced as `leave` 3 seconds later, unless the same `me` is back by then. The health check `https://rooms.jonniepeed.games/` returns the version and limits.

## rooms.js reference

- `Rooms.open({ game, max, secret, url, updateLink })`: new match. `updateLink: false` leaves the page's link alone.
- `Rooms.join({ game, code, url })`: the match in `code` or the page's link; `null` when there's none.
- `Rooms.newCode()`, `Rooms.codeFromLink()`, `Rooms.share({ url, title, text })` (resolves `'shared'`, `'copied'`, `'cancelled'` or `'failed'`), `Rooms.copy(text)`.
- A room: `seat`, `host`, `isHost`, `max`, `players` (all seats, mine included), `others`, `rtt` (round trip to the room, ms), `status` (`connecting`, `connected`, `reconnecting`, `refused`, `left`), `code`, `link`, `send(obj)`, `sendTo(seat, obj)`, `leave()`, `on(event, fn)`, `off(event, fn)`.
- Events: `ready`, `join`, `leave`, `host`, `message`, `status`, `rtt`, `seat` (rare: your seat went to someone else while you were away), `error`, `refused`.
- While not connected, `send` returns `false` and drops the message; a game that must not lose one re-sends it after `status` returns to `connected`.
- Pages on `localhost` or `127.0.0.1` use a local Worker on port 8788; everywhere else, the live one.

rooms.js is shared code: it only grows (README, "Shared code stays compatible").

## Cost

The Workers Free plan counts 100,000 requests a day, and 20 incoming WebSocket messages count as one request; what the room sends out is free. A phone sending 30 messages a second uses about 5,400 requests an hour. The table above gives hours a day per pattern. (Pings, every 2.5 s, are answered without waking the room; even if they count, they're about 70 requests an hour per phone.) Over a free limit, new requests fail until midnight UTC. Nothing is ever charged; the paid plan raises the limits if a game takes off.

A single room can take about 1,000 messages a second before Cloudflare starts queueing them: roughly eight phones all at the rate limit, and far more than any of the patterns above need. There's no limit on how many rooms are open at once.

## Deploying

Only changes in `rooms/` need a deploy, and those deploy themselves. Changes in `site/` (including `rooms.js` and games) need the manual Pages deploy. When a change touches both, merge it, let the rooms deploy finish, then run Pages.

- **Automatic:** merging a change to `rooms/` (or to `.github/workflows/rooms-worker.yml`) into `main` runs **Deploy Rooms Worker**. It runs `rooms/test/relay.mjs` against a local copy first, so a broken change never replaces the live Worker; then it deploys and runs the same test against the live Worker. Check the Actions tab if it fails.
- **By hand:** Actions tab → **Deploy Rooms Worker** → Run workflow, or `wrangler deploy` from `rooms/`.

It uses the same `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets as the leaderboard. A deploy drops matches in progress for a moment; pages reconnect by themselves. Changes to the room must keep older pages working: add fields and options, don't change what existing ones mean.

## Testing

Start the site and a local rooms Worker. `GHOST_MS:6000` lets silent phones go after 6 seconds instead of 15, and `LEAVE_GRACE_MS:500` announces leaves after half a second instead of 3, so tests are quicker:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory site
(cd rooms && wrangler dev --local --port 8788 --var GHOST_MS:6000 --var LEAVE_GRACE_MS:500)
```

Then, from the repository root:

```sh
GHOST_MS=6000 LEAVE_GRACE_MS=500 node rooms/test/relay.mjs   # the room itself
CHROMIUM=/usr/bin/chromium python3 tests/rooms/test.py       # rooms.js in real browsers
```

The relay test covers the secret, room size and game, seats and the host, `to`, message limits and errors, the rate limit, silent phones, the leave grace period, reconnecting and rooms from the first version. The rooms.js test covers opening and joining, events, every refusal, a dropped connection, a reload, a duplicated tab, host changes and a connection that dies silently.

**Testing a game:** `tests/rooms/harness.py` opens several phone-sized browsers, each with its own session like separate phones, and collects page errors. `tests/dont-click-this/test.py` uses it to play a whole four-phone match. Still try a new game on two real phones on different networks before calling it done; that's the only test of real signal.

## Adding a game

1. Load `../assets/rooms.js` before `game.js`. Use `Rooms.open` with your game's slug and size behind the secret, and `Rooms.join` for links.
2. Pick a pattern (above) and design the messages: a `t` for the type, short keys, at most about 30 a second per phone.
3. Handle `join`, `leave` and `refused`. For the host or same-game patterns, handle `host` and catch up joiners with `sendTo`.
4. Show `room.status` when it's `reconnecting`.
5. Write a test with `tests/rooms/harness.py`, and play it on two real phones.
