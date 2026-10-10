# 05: Rooms

Rooms let two phones play together over the internet. A game makes a random code and puts it in a link after the `#`; whoever opens the link joins that room, and the rooms Worker passes each phone's messages to the other. No accounts. Opening a new room takes the secret. [Don't click this](../games/dont-click-this.md) is the first game to use it.

## How it works

- The Worker is `rooms/` (`jonniepeed-games-rooms`), at `rooms.jonniepeed.games`. Each room is a Cloudflare Durable Object named by its code.
- A phone connects a WebSocket to `wss://rooms.jonniepeed.games/room/<code>?me=<id>`. Codes are 8–32 characters, `a-z` and `0-9`. `me` is a random id for that page visit.
- **The secret.** A room nobody has opened yet only opens for a connection with `&s=meatball` (`SECRET` in `rooms/src/index.js`). After that its link works without it for a week, then the room forgets it was open. A refused opener gets `{"t":"nope"}` and close code 4003. The repo is public, so the secret keeps out passers-by, not anyone who reads the code; a real lock would be a Worker secret set with `wrangler secret put`, typed in rather than picked.
- Two seats per room. The room sends:
  - `{"t":"hello","seat":1|2,"others":0|1}` to the phone that just joined,
  - `{"t":"join","seat":n}` and `{"t":"leave","seat":n}` to the other phone,
  - `{"t":"full"}` to a third phone, then closes with code 4001.
- Any other text a phone sends (up to 1,024 characters) goes to the other phone as is. What the messages mean is up to the game.
- A phone that reconnects with the same `me` takes back its seat; its old connection closes with code 4002.
- `ping` is answered with `pong` without waking the room, so games can measure their round trip.
- Rooms use hibernatable WebSockets: a room sleeps between messages. The only thing stored is when it was opened; an alarm clears it after a week.
- Anyone with a link can join that room. Codes are long and random, so links can't be guessed, but nothing else protects a room.

## Cost

It runs on the Workers Free plan: SQLite-backed Durable Objects, which the free plan allows. The free plan counts 100,000 requests a day, and 20 incoming WebSocket messages count as one request. A game sending 30 messages a second from each phone uses about 11,000 requests an hour of play. Over a free limit, new requests fail until midnight UTC; nothing is charged.

## Deploying

Only changes in `rooms/` need a deploy, and those deploy themselves. Changes in `site/` only need the manual Pages deploy. When a change touches both, merge it, let the rooms deploy finish, then run Pages.

- **Automatic:** merging a change to `rooms/` (or to `.github/workflows/rooms-worker.yml`) into `main` runs **Deploy Rooms Worker** by itself. It deploys `rooms/` and then runs `rooms/test/relay.mjs` against the live Worker (retrying for a few minutes while a new custom domain's certificate is issued). If it fails, the old Worker keeps running; check the Actions tab.
- **GitHub, by hand:** Actions tab → **Deploy Rooms Worker** → Run workflow.
- **Terminal:** `wrangler deploy` from `rooms/`.

It uses the same `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets as the leaderboard. The first deploy creates the Durable Object class and the `rooms.jonniepeed.games` custom domain. If it's refused, the API token may need permission to edit Workers and Durable Objects, or the custom domain; Cloudflare's error says which. A deploy drops any match in progress; the pages reconnect on their own.

## Local testing

```sh
cd rooms && wrangler dev --local --port 8788
```

On `localhost` or `127.0.0.1`, games use `ws://localhost:8788`; everywhere else they use the live Worker. Then, from the repository root:

```sh
node rooms/test/relay.mjs
```

It checks the secret, seats, relaying both ways, ping, the full room, reconnecting and leaving. `ROOMS_URL` points it elsewhere (the deploy workflow uses `wss://rooms.jonniepeed.games`).

## Adding a game

1. Make a code with `crypto.getRandomValues` and put it in the page's `#`, so the link is the invitation. The phone that opens the room sends `&s=` with the secret; phones joining from the link don't.
2. Connect to the room, send `ping` every few seconds, and reconnect after a drop with the same `me`.
3. Decide the messages. Keep them small and send at most about 30 a second.
4. Handle `hello`, `join`, `leave`, the 4001 close (full) and the 4003 close (wrong secret, or a room that isn't open).

`site/dont-click-this/game.js` does all four in its "connection" section and `askSecret`.
