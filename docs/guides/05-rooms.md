# 05: Rooms

Rooms let two phones play together over the internet. A game makes a random code and puts it in a link after the `#`; whoever opens the link joins that room, and the rooms Worker passes each phone's messages to the other. No accounts, nothing stored. [Don't click this](../games/dont-click-this.md) is the first game to use it.

## How it works

- The Worker is `rooms/` (`jonniepeed-games-rooms`), at `rooms.jonniepeed.games`. Each room is a Cloudflare Durable Object named by its code.
- A phone connects a WebSocket to `wss://rooms.jonniepeed.games/room/<code>?me=<id>`. Codes are 8–32 characters, `a-z` and `0-9`. `me` is a random id for that page visit.
- Two seats per room. The room sends:
  - `{"t":"hello","seat":1|2,"others":0|1}` to the phone that just joined,
  - `{"t":"join","seat":n}` and `{"t":"leave","seat":n}` to the other phone,
  - `{"t":"full"}` to a third phone, then closes with code 4001.
- Any other text a phone sends (up to 1,024 characters) goes to the other phone as is. What the messages mean is up to the game.
- A phone that reconnects with the same `me` takes back its seat; its old connection closes with code 4002.
- `ping` is answered with `pong` without waking the room, so games can measure their round trip.
- Rooms use hibernatable WebSockets: a room sleeps between messages. Nothing is written to storage, and a room is empty once both phones leave.
- Anyone with a link can join that room. Codes are long and random, so links can't be guessed, but nothing else protects a room.

## Cost

It runs on the Workers Free plan: SQLite-backed Durable Objects, which the free plan allows. The free plan counts 100,000 requests a day, and 20 incoming WebSocket messages count as one request. A game sending 30 messages a second from each phone uses about 11,000 requests an hour of play. Over a free limit, new requests fail until midnight UTC; nothing is charged.

## Deploying

Only changes in `rooms/` need a deploy. Changes in `site/` only need the Pages deploy.

- **GitHub:** Actions tab → **Deploy Rooms Worker** → Run workflow. It deploys `rooms/` and then runs `rooms/test/relay.mjs` against the live Worker (retrying for a few minutes while a new custom domain's certificate is issued).
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

It checks seats, relaying both ways, ping, the full room, reconnecting and leaving. `ROOMS_URL` points it elsewhere (the deploy workflow uses `wss://rooms.jonniepeed.games`).

## Adding a game

1. Make a code with `crypto.getRandomValues` and put it in the page's `#`, so the link is the invitation.
2. Connect to the room, send `ping` every few seconds, and reconnect after a drop with the same `me`.
3. Decide the messages. Keep them small and send at most about 30 a second.
4. Handle `hello`, `join`, `leave` and the 4001 close (full).

`site/dont-click-this/game.js` does all four in its "connection" section.
