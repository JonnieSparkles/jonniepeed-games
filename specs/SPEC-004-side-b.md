# SPEC-004: Side B

Status: implemented. The studio homepage has a hidden development shelf, rainbow overflow discovery, visit-scoped side selection and one Stick Army demo card. Automated browser acceptance checks live in `tests/studio/`. The ar.io gateway acceptance check is deferred while Arweave publishing is paused.

## Rollout and dependencies

1. PR #3 (Stick Army) and PR #4 ([SPEC-003](SPEC-003-repo-layout.md)) are merged. Stick Army remains noindexed. SPEC-003 is complete: player links use trailing-slash `<slug>/` entries only, with no slashless aliases. Side B was implemented on a separate branch from the latest `main`, after PR #4.
2. The moved `site/assets/studio/ident.js`, game-owned `site/stick-army/thumb.webp` and clean `stick-army/` link are used. Side B placement is not promotion to the public Side A shelf. Review first and publish only by hand; GitHub Pages uses manual `workflow_dispatch`.
3. Arweave publishing remains paused pending the uploader/manifest follow-up, as recorded in SPEC-003 and README. Skip the ar.io gateway acceptance check in this implementation. Before publishing resumes, confirm uploader support and receipt format, use root `index.path: "index.html"`, and map every `<slug>/` to the same transaction ID as `<slug>/index.html`, including unlisted demos. Test a fresh manifest on an ar.io gateway at a manifest-ID mount and an ArNS root where available; record the manifest ID, gateway URL and results. No slashless aliases, upload or production ArNS update are introduced here.

Stick Army was built from [SPEC-002](../docs/games/stick-army/original.md). Its living doc is [Stick Army](../docs/games/stick-army/README.md), moved by SPEC-003. Update the living doc when Side B launches and when the game is promoted.

## Discovery: let the rainbow overflow

The homepage egg lives in `site/assets/studio/ident.js` after SPEC-003. Holding charges power from zero to full in about 1.4 seconds; release makes the existing splash (currently available above 0.7 power). Preserve that behavior and idle animation for every release before the new threshold.

Add one stage: while still held at full power, accumulate about three more seconds. At the end, the stream overflows and flips the shelf to Side B. From a cold start this takes about 4.4 seconds; measure the extra time at full power, not from initial press. One continuous hold can trigger only one flip. On Side B the overflow does not toggle back or retrigger; returning uses the Side A button. Releasing, cancelling, losing focus or hiding the document resets overflow progress, so separate holds cannot add up and a background tab cannot complete it.

**Visible cue: a rising rainbow puddle.** Once power reaches full, the puddle at the stream's landing point grows in pixel rows throughout the extra three seconds. Show its growth from a thin stripe to a full puddle, then spill it into the shelf flip. It stays within the egg canvas; no new image asset or explanatory dialog is needed. Earlier release stops this growth and uses the current splash. The effect should make continued holding visibly productive rather than leaving a static full-power stream.

Mouse/touch pointer holding and holding Space or Enter on the focused egg use the same progress and trigger. Prevent Space scrolling while held, ignore key-repeat as a fresh press, and handle pointer cancellation and blur. Update the egg's accessible description to include both keyboard keys and the extended hold. With reduced motion, show the puddle growing in discrete steps and switch the shelf immediately; the trigger still works even though the existing reduced-motion path stops the idle RAF animation. Advance hold timing only while the egg is held and the document is visible.

## Shelf flip and state

Keep one shelf grid and one small function that sets its side. On Side A the heading remains **Games** and the public cards show. On Side B the heading becomes **Side B**, public cards hide, development cards show, and a **Side A** button appears. That button returns the public cards and original heading. No separate route, fetched catalog or build system is needed.

Use a brief cassette-style flip: rotate the shelf/card area around its horizontal axis, change the side at the midpoint, then settle it back into place (about 400 ms total). Do not mirror text or let inactive cards remain interactive during the transition. Reduced-motion preference skips the rotation. Guard the transition so repeated input cannot queue flips.

Inactive cards use the native `hidden` attribute, with CSS that does not override it. They must be absent from layout, tab order and the accessibility tree. Hide the Side A button on Side A too. Give the shelf heading `tabindex="-1"`; after a user-triggered flip move focus to the updated heading, including when returning to Side A, so focus never remains in a hidden card or button. Keep the heading visibly focusable for that moment. Initial loading need not steal focus.

Remember the selected side for the visit in `sessionStorage` (one key, for example `jonniepeed.shelfSide`, storing `a` or `b`). Wrap reads and writes in `try/catch` and ignore unknown values; denied storage must not break discovery or navigation. Do not use localStorage or cookies.

On initial load, `#side-b` takes priority and shows Side B directly, without the hold or flip animation. Otherwise restore the visit's selected side, defaulting to Side A. Persist explicit changes, including direct-hash entry. If the Side A button is used after a `#side-b` entry, clear that specific hash with `history.replaceState` so reload does not undo the choice; leave other fragments/query parameters alone. Keep this as a simple initial hash check and side setter, not a router. A new session without the hash starts on Side A.

## Cards, badges and promotion

Side B cards are ordinary anchors in `site/index.html`, in the existing grid. Mark each with `data-side="b"` and `data-badge="demo"`. Existing unmarked cards belong to Side A. Keep development cards hidden in the initial HTML so they do not flash or become accessible before JavaScript decides the side; without JavaScript the public shelf still works.

Populate a visible badge using the card's `data-badge` text (a dedicated badge span or CSS `content: attr(data-badge)`). Make that same text available to screen readers; do not rely only on generated CSS content. Use text content rather than HTML. A new label needs only a new attribute value, not a code branch, registry or badge-color mapping.

Launch with one Side B card and one label: **demo**, meaning a new game in development. Stick Army is the first card, using `href="stick-army/"` and the post-SPEC-003 `stick-army/thumb.webp` thumbnail with the usual stamped hash, dimensions and useful alt text. There is no Side A Stick Army card yet. Game-to-home navigation uses `../`, retaining the current site mount; session storage restores Side B when the player returns in the same visit.

Demo game pages keep `<meta name="robots" content="noindex">` until promoted. Side B is discoverable by its egg or direct hash; it is not authentication or a private release. Do not noindex the whole studio homepage. Promotion is a small explicit change: move the card to Side A (remove `data-side="b"` and its demo badge), remove the game's noindex tag, and update its living doc. Run stamp and the applicable preview checks. Do not promote automatically based on visits or saved state.

## Future labels: document only

- **update:** the next version of a live game, in a sibling folder `site/<slug>-update/`. It remains at the same depth so `../assets/` resources and `../` home links work. It never posts to the live leaderboard board. When finished, it replaces the original game's files at the original slug and the sibling copy/card is deleted, with no redirect or compatibility copy. Keep its local best storage isolated while testing. No update card, copy workflow or score integration is built for this spec's launch.
- **archive:** deferred. Keeping old versions playable conflicts with the repo's no-backward-compatibility rule. Shared assets would need snapshotted copies so future changes do not break the exhibit. Revisit only as a deliberate exhibit with an explicit standards decision; do not preserve replaced update folders as archives now.

Follow [the leaderboard guide](../docs/guides/00-leaderboards.md) before adding online scores or changing scoring. Stick Army has local scores only; Side B adds no API calls, board or Worker changes. Future update builds should keep online submission disabled by default; any separate testing setup needs its own reviewed rules and must never submit to the live positive board. Do not show test boards in real games or invent a permanent `-update` API game ID just because that folder exists. If promotion changes score meaning or difficulty, register a new positive board and deploy the Worker first, then change the frontend BOARD and run `tools/check_boards.py`. Keep original game IDs, all old boards/meta keys/ranges and `/v1/` contracts backward compatible. Deleting a frontend copy never deletes its API records.

## Implementation locations

| Location after SPEC-003 | Work |
| --- | --- |
| `site/index.html` | Side-aware shelf heading/button, hidden demo card, attribute-driven badge, minimal flip styles and reduced-motion behavior |
| `site/assets/studio/ident.js` | Extend existing hold input with full-power overflow timing and puddle cue; add the small shared side setter, initial hash/storage checks and focus handling |
| `site/stick-army/index.html` | Keep noindex; add shared favicon/touch icons and marked `../` home links on title, pause and game-over cards |
| `docs/games/stick-army.md` | Record Side B demo status, entry path and promotion steps; keep noindex until promotion |
| `tests/studio/test.py` | Automated hold/input, shelf/focus/accessibility, hash/session/storage, badge and responsive acceptance checks |
| `README.md` | Brief Side B/card authoring and promotion instructions; no changes to manual publishing or leaderboard contracts |

Use the existing plain classic script. Keep timing constants and side state together, with no new dependencies or asset uploads just for the effect. Discover cards from their attributes rather than hard-coding titles into the script. Follow SPEC-003's resolved manifest decision (publishing remains paused): all game directories, including unlisted demos, need their clean trailing-slash entries when publishing to Arweave. Regenerate previews after art changes, then run `python3 tools/stamp.py` after all site changes; the generic studio preview should remain generic.

## Acceptance checks

- Default load in a new session shows Games and public cards only. Holding/releasing before full power or during the extra three seconds preserves the existing animation/splash and never opens Side B. A continuous hold at full power for about three seconds opens it exactly once; the puddle visibly builds during that stage.
- Mouse, touch, Space and Enter all trigger the same behavior. Keyboard hold does not scroll; repeated keys, pointer cancel, blur and tab visibility changes do not accumulate progress or queue flips. Reduced-motion users can discover Side B without rotation or continuous idle animation.
- A flip shows the Side B heading, demo card and Side A button; public cards are hidden. Side A restores Games and only the public cards. Focus lands on the current shelf heading after each user flip; inactive cards/button cannot be tabbed to and are absent from the accessibility tree. Test short landscape, portrait and desktop, light/dark themes and reduced motion.
- `#side-b` opens Side B directly. Reload and same-tab game/home navigation retain the visit's choice; the Side A button works after direct-hash entry. New-session default is Side A. Denied/unavailable session storage still permits both flips without console errors. Without JavaScript only the public shelf is exposed.
- Changing or adding a card's `data-badge` value changes its visible and accessible label without script changes. The only launch label is demo, on the single Stick Army card; no update/archive feature is present.
- Stick Army opens from `stick-army/`, its local thumbnail displays, home navigation stays in the same mount, and the page remains noindexed. The public studio page stays indexable. Verify relative links and assets at a Pages-style mount and domain root, with no missing assets. Live Pages/custom-domain verification belongs to manual release; the test Arweave manifest and ar.io gateway check are deferred to the uploader follow-up above, using trailing-slash entries only.
- No demo/update traffic posts to a live leaderboard board, no scores API contract changes are made, and existing public leaderboard behavior is unchanged. Stick Army's gameplay and UI harnesses pass from `tests/stick-army/` after SPEC-003; board checks pass if bindings are touched.
- The promotion checklist is documented and testable: move card to Side A, remove game noindex, update living docs, stamp and publish manually. Before promotion the demo remains on Side B only. No automated deployment, production ArNS update or archive copy is introduced.
