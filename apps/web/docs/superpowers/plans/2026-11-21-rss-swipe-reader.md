# RSS Swipe Reader Implementation Plan

> **Current state (2026-11-22):** this is a historical record, kept as written except for renamed paths.
> Since then: the project is 줍줍 (JOOBJOOB); routes are `/library` and `/subscriptions` (was `/saved`, `/settings`);
> shadcn/ui was replaced by the vendored Catalyst UI kit (`src/components/catalyst`) and all custom CSS classes by
> Tailwind utilities; Figma SVG assets were replaced by Heroicons; fonts are self-hosted Maru Buri (not Noto);
> the independent interest "heart" became 챙기기, one of three exclusive outcomes (bookmarked > stored > dropped).
> The up-to-date behavior is in [the design spec](../specs/2026-11-21-rss-swipe-reader-design.md).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Communicate with every subagent exclusively in English. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver issue #2 as an RSS/Atom swipe reader with browser-local subscriptions and selection state.

**Architecture:** Next.js serves three pages and a feed-fetching Route Handler. A provider-scoped Zustand store owns persisted browser state and session undo history. Per-source SWR hooks own request caching and revalidation, merging successful results into the latest store state. Tailwind CSS and shadcn/ui implement the approved interface; es-toolkit handles applicable collection operations.

**Tech Stack:** Next.js 16.4.6, React 19.3, TypeScript, Yarn 4.18.1, Tailwind CSS v4, shadcn/ui, Zustand, SWR (`useSWR`), es-toolkit, native Node.js test runner, RSS/Atom parser, IP-address classification library, Heroicons.

**Spec:** `docs/superpowers/specs/2026-11-21-rss-swipe-reader-design.md`

## Global Constraints

- Implement on `feat/2/rss-feed-ui`; retain Yarn and the existing ESLint/Prettier configuration.
- Files and developer documentation use English. Product copy uses Korean.
- One visible story card during discovery; use the approved Tinder-inspired layout and Heroicons.
- Use Tailwind CSS for styling and shadcn/ui for shared controls and feedback. Keep Heroicons as the product icon library.
- Use Zustand for reader state, SWR for feed requests, and es-toolkit native utilities where applicable.
- Fetch feeds on the server; personal state stays in localStorage. No accounts or database.
- Heart toggles interest without advancing, saving, or opening the current story.
- Deferral appends to the current queue; undo restores the preceding selection state without changing interest.
- No AI recommendations, translation, newsletter ingestion, invitations, or background polling.
- No main-branch merge, issue closure, or deployment is included.

## Review Focus

- A feed redirects to an internal host or resolves to mixed public/private addresses: reject before connecting.
- A source fails after previous successful results: retain its stories, show stale status, and offer retry.
- A browser reload or corrupt localStorage occurs: restore valid records or show an actionable storage error without overwriting corruption.
- The user drags diagonally, taps an action, or scrolls long text: do not accidentally open the original or apply two actions.
- A refresh overlaps another refresh or a selection: late results must not duplicate stories, revive skipped stories, or undo the user's selection.

## File Map

- `src/lib/reader.ts`: Story/source/state types, URL normalization, queue actions, feed-result merge, and persisted-state validation.
- `src/lib/reader.test.ts`: Pure state and storage-validation tests.
- `src/lib/feed-fetch.ts`: Bounded, SSRF-resistant HTTP(S) download with pinned validated DNS results and validated redirects.
- `src/lib/feed.ts`: Parse RSS/Atom into safe, plain-text story records.
- `src/lib/feed.test.ts`, `src/lib/feed-fetch.test.ts`: Parser fixtures and external-input/security tests.
- `src/app/api/feed/route.ts`: Validate one requested URL and return one source result.
- `src/stores/reader-store.ts`: Vanilla Zustand store, validated localStorage persistence, selection actions, result merging, and session undo.
- `src/stores/reader-store.test.ts`: Store isolation, storage failures, hydration, and selection/fetch race tests.
- `src/components/reader-provider.tsx`: Provider-scoped store creation, client hydration, and typed selector access.
- `src/hooks/use-feed.ts`: Per-source `useSWR` requests, success/error synchronization, registration fetching, and explicit revalidation.
- `src/components/feed-sync.tsx`: Mount per-source request hooks once under the provider so route navigation does not restart collection.
- `src/components/reader-shell.tsx`: Header/navigation and compact fetch-status summary.
- `src/components/story-card.tsx`: Pointer gestures, keyboard actions, original link, action bar, and interest state.
- `src/app/page.tsx`, `src/app/library/page.tsx`, `src/app/subscriptions/page.tsx`: Discovery, saved stories, and subscription management.
- `src/app/layout.tsx`, `src/app/reader.css`: Provider, Korean document language, metadata, Tailwind import, and minimal shadcn theme tokens.
- `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/alert.tsx`: shadcn/ui controls used by the reader; add other components only if the screens require them.
- `components.json`, `postcss.config.mjs`, `src/lib/utils.ts`: shadcn aliases, Tailwind v4 PostCSS integration, and the shared class-merging utility.
- `eslint.config.mjs`: Point the existing Tailwind ESLint plugin at the actual application stylesheet; remove the obsolete lint-only `tailwind.css`.
- `package.json`, `yarn.lock`, `README.md`: Dependencies, test command, usage, limitations, and validation instructions.

### Task 1: Browser State and Queue Semantics

**Interfaces:**

- `Story`: `id`, `sourceUrl`, `sourceTitle`, `title`, `description`, `url`, nullable `publishedAt`.
- `ReaderState`: sources, stories keyed by ID, ordered queue IDs, saved timestamps, skipped IDs, interest timestamps.
- `selectStory(state: ReaderState, action: "skip" | "save" | "defer"): ReaderState`.
- `toggleInterest(state: ReaderState, id: string, now: string): ReaderState`.
- `mergeFeed(state: ReaderState, result: FeedResult): ReaderState`.
- `parseStoredState(value: string): ReaderState`; reject unsupported versions and malformed records.

- [x] Write tests before implementation: deferring `[a,b,c]` produces `[b,c,a]`; saving removes `a` and records its timestamp; skipping prevents requeue; heart preserves queue and saved state; one-item deferral preserves the item.
- [x] Add merge tests: new stories prepend in publication order; existing deferral order survives; repeated results do not duplicate; missing dates sort last; saved/skipped IDs stay excluded.
- [x] Add storage tests: round-trip queue order and interest; malformed JSON, invalid link protocols, and unsupported versions are rejected.
- [x] Run `yarn test` and confirm the new tests fail before implementation. Use a small TypeScript-compatible Node test command; add a dev runner only if the current runtime cannot execute the tests reliably.
- [x] Implement the interfaces in `src/lib/reader.ts`, keeping selection and merge functions immutable. Use es-toolkit `uniqBy`, `orderBy`, and `keyBy` where they simplify deduplication, chronological ordering, and indexing.
- [x] Run `yarn test`; expect the state suite to pass.

### Task 2: Safe Server Feed Collection

**Interfaces:**

- `downloadFeed(url: string): Promise<{ xml: string; url: string }>` in `feed-fetch.ts`.
- `parseFeed(xml: string, sourceUrl: string): FeedResult` in `feed.ts`.
- `POST /api/feed` accepts `{ url: string }`; returns `FeedResult` on success and a stable error code plus readable reason on failure. Responses use `Cache-Control: no-store`.
- `FeedResult`: source title, normalized subscription URL, fetched timestamp, stories, and excluded-item count.

- [x] Check current parser and Heroicons documentation through Context7 before configuring their APIs. Tailwind CSS, shadcn/ui, Zustand, SWR, and es-toolkit documentation was checked during the stack revision. Inspect package versions and peer requirements before installing dependencies with Yarn.
- [x] Write parser tests for RSS 2.0, Atom, relative links, plain-text descriptions, invalid XML, HTML instead of XML, missing dates, missing original links, duplicate entries, and hostile markup.
- [x] Write fetch tests for localhost, IPv4/IPv6 private and mapped addresses, URL credentials, mixed DNS answers, private redirects, excessive redirects, timeout, oversized bodies, and upstream HTTP errors. Use injected DNS/transport boundaries or local test fixtures; never request real internal services.
- [x] Run the tests and confirm failure before implementation.
- [x] Implement download limits: 10 seconds total including DNS and redirects, 2 MiB response body, at most 3 redirects, and HTTP(S) URLs no longer than 2,048 characters. Use ordinary HTTP(S) ports only.
- [x] Validate all DNS answers using an established IP-address library. Pin the validated public address in the connection lookup while preserving the original hostname for TLS. Repeat checks on every redirect; do not forward cookies or authentication.
- [x] Parse using an established RSS/Atom parser with external entities disabled. Reject DTD/entity declarations. Limit each source to 100 stories; strip HTML to plain text using a parser, and accept only safe original links. Feed-image support is optional; text cards fully satisfy the design.
- [x] Implement the Node-runtime Route Handler with input validation, bounded request input, error-code mapping, and no persistence. Preserve the submitted normalized URL as subscription identity across redirects.
- [x] Run `yarn test`; expect state, parser, and security suites to pass.

### Task 3: Connected Single-Card Reader

**Interfaces:**

- `createReaderStore()` creates a vanilla Zustand store per provider instance. `useReaderStore(selector)` reads it without a server-global singleton.
- `ReaderProvider` exposes the scoped store and hydrates it on the client. Store actions implement selection, undo, interest, registration, and successful feed merging.
- `useFeed(sourceUrl)` uses `useSWR` with a key disabled until hydration finishes. It owns per-source request data, errors, loading state, and `mutate()` for retry.
- `FeedSync` mounts source hooks once under the root provider. Limit the shared fetcher to 4 concurrent requests; let SWR deduplicate equal keys.
- Successful SWR responses merge against the latest Zustand state. Never mirror SWR's entire cache in Zustand or overwrite selection state from a stale request snapshot.
- Undo snapshots only queue/saved/skipped selection state; interests and source data remain independent. Clear history when a full refresh changes queue composition.

- [x] Write focused interaction tests or an executable browser test for: heart stays on card, save then undo restores both lists, defer then undo restores order, dragging does not open a link, action clicks do not trigger gestures, and reload restores selection records.
- [x] Add Zustand store tests before implementation: two store instances remain isolated; hydration restores the queue; malformed storage is not overwritten; write failure is surfaced; a late feed result cannot requeue a story skipped while the request was pending.
- [x] Implement Zustand storage hydration before automatic refresh. Use a versioned localStorage key; catch read/write/quota failures and preserve corrupt raw storage without automatic writes. Provide clear recovery instructions rather than silently resetting data.
- [x] Implement SWR automatic refresh on app open, explicit full refresh through keyed mutation, and per-source retry through `mutate()`. Disable focus/reconnect revalidation, polling, and automatic error retries; returning from an article must not unexpectedly reorder the queue. Maintain previous stories on failure and expose success/failure reasons with timestamps.
- [x] Implement registration only after feed validation; normalize URLs, report duplicates, and keep failed registration input available for retry.
- [x] Configure Tailwind v4 with `@tailwindcss/postcss`, import Tailwind in `src/app/reader.css`, and configure shadcn/ui aliases and theme variables. Add only the button, input, and alert components initially. Keep Heroicons instead of generated Lucide defaults.
- [x] Implement the shared shell and three routes with Tailwind utilities, shadcn/ui controls, and Heroicons. Render one card, top navigation, and five circular controls: undo, skip, defer, heart, save. Link source-error summaries to settings.
- [x] Implement pointer thresholds with dominant-axis selection; require 80 px movement to commit, return incomplete gestures to origin, exclude controls and scrollable content, and suppress post-drag clicks. Provide keyboard and button equivalents, focus indicators, live announcements, and reduced-motion support.
- [x] Render saved stories by save timestamp. Keep source status and retries in settings. Implement loading, no subscriptions, no stories, all processed, partial failure, and total failure states.
- [x] Add responsive Tailwind styles and Korean product copy. Keep stylesheet content limited to Tailwind imports, shadcn theme tokens, and necessary global rules. Preserve real feed text without translation or fabricated images. Do not ship personal Gmail fixtures.
- [x] Run tests and `yarn typecheck`; expect passing results.

### Task 4: End-to-End Verification and Handoff

- [x] Exercise registration, invalid/duplicate feeds, automatic refresh, individual failure/retry, all five card controls, original links, and page reload using controlled RSS/Atom fixtures.
- [x] Verify mobile and desktop layouts, long titles/descriptions, touch versus text scrolling, empty queue undo, unavailable localStorage, and delayed concurrent refresh results. If browser automation is unavailable, report the exact unverified flows.
- [x] Update README with Yarn commands, browser-local storage behavior, supported feeds, server limits, and excluded features.
- [x] Run `yarn test`, `yarn lint`, `yarn format:check`, `yarn typecheck`, and `yarn build`; require all to pass.
- [x] Review the final diff for generated files, unintended changes, personal data, missing error paths, and scope creep. Record any remaining limitations.
- [x] Present the implementation and verification evidence on the feature branch. Do not merge, deploy, close issue #2, or push without authorization for that action.
