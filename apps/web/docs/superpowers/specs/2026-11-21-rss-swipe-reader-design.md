# 줍줍 (JOOBJOOB) RSS Swipe Reader — Issue #2 Design

Status: Implemented. Updated 2026-11-22 to match the shipped behavior (project renamed from Moa/스윽 to 줍줍;
UI moved from shadcn/ui to the Catalyst UI kit; articles now end as bookmarked, stored, or dropped).
Branch: `feat/2/rss-feed-ui`

## Goal and Sources

Help users quickly evaluate individual RSS/Atom stories one card at a time and revisit saved stories.
The user approved the `swipe-reader-tinder-v6.html` mockup.
Mockups are local review materials, excluded from product code and deployment assets.

Product specification: https://www.notion.so/41eb24f4c8038126919dee145a253c4c

The broader product includes newsletter ingestion, accounts, invitations, and translation.
This implementation is limited to the scope below. Swiping, saving, and deferring were originally
excluded from issue #2 but were subsequently added at the user's explicit request.

## Selected Approach

- Browser-side and Next.js server-side fetching were considered; the user chose server-side fetching.
- Fetch and parse RSS/Atom on the Next.js server. Return normalized JSON to the browser.
- Keep subscriptions and selection records in the current browser's localStorage.
- Account-based persistence is future work. Do not introduce accounts or a database now.
- After reviewing a list-based design, the user selected a Tinder-inspired, single-card interface.
- Open the original article in a new tab instead of building an article-content viewer.
- Use Tailwind CSS and the Catalyst UI kit (Tailwind Plus, vendored unmodified in `src/components/catalyst`)
  for the interface, Zustand for browser-local reader state,
  SWR (`useSWR`) for feed request caching and revalidation, and es-toolkit for applicable data utilities.

## Screens

- `/`: One central card sized to fit the viewport, an action bar beneath it, a settings cog in the header,
  and bottom tab navigation (피드 / 보관함 / 구독).
- `/library` (보관함): every processed article, grouped in priority order — 북마크 (bookmarked) > 챙긴 소식 (stored) >
  안 읽은 소식 (dropped). Bookmarked and stored render as cards; dropped renders as a muted one-line list.
- `/subscriptions` (구독): RSS/Atom URL registration, subscribed sources, per-source fetch results, and individual retries.
- Do not keep a source-status sidebar visible during discovery. Show compact fetch progress and failure counts,
  linking failures to detailed results in settings. This is a proposed implementation choice to preserve card focus.
- Support mobile and desktop. Use Heroicons for icons.
- Use Catalyst components (Button, Field/Label/Input, Heading, Text, Avatar, Link) for shared controls, styled with
  Tailwind utilities; `reader.css` holds only the Tailwind import, theme tokens, fonts, and base styles.
  The app is light-only: Catalyst's `dark:` styles apply only under an explicit `.dark` class.
  Use Heroicons; they carry `data-slot="icon"`, so size and colour them through Catalyst's `--btn-icon` variables.
- Do not invent images or generate summaries. Use text cards when an image is unavailable.
- Mockup examples come from individual TLDR Dev stories dated 2026-11-12, found in Gmail.
  Do not include Gmail account details, raw emails, tracking links, or unsubscribe links in the product.

## Card Actions

Every article ends in exactly one category, in priority order bookmarked > stored > dropped.

| Input                                    | Result                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| 북마크 button                            | Bookmark (keep) the story and show the next card                                |
| Swipe right / 챙기기 button / ArrowRight | Store the story to read later and show the next card                            |
| Swipe left / 안 읽기 button / ArrowLeft  | Drop the story: it leaves the feed and appears only in the library's last group |
| Swipe up / defer button / ArrowUp        | Move the current story to the end of the same selection queue                   |
| Undo button / Ctrl+Z                     | Undo the previous choice, restoring queue, bookmarks, and stored marks          |
| Card tap / title link                    | Open a safe HTTP(S) original link in a new tab without changing the queue       |

- The action bar orders buttons by rising priority left to right (undo, 안 읽기, defer, 챙기기, 북마크); 북마크 is filled.
- After the last card only the undo button remains (when there is history). Disable undo when no history exists.
- While dragging, the red (안 읽기) or blue (챙기기) panel fades in with the drag and reaches full colour exactly at the
  80px trigger point, where the icon pops. Devices with the Vibration API vibrate there; iOS Safari has no web haptic
  (a switch-input workaround was tried on iPhone and produced nothing), so iPhones get visual feedback only.
- The whole card is draggable; the card follows the finger 1:1 and only the snap-back animates.
- AI recommendations are excluded.
- Downward swipes, blue stars, and edge taps remain undecided and are excluded.
- Deferring the last remaining card leaves it in the queue. Deferring neither completes a story nor creates a separate deferred list.
- A drag must not trigger a click. Action buttons must not trigger swipes or open original links.
- Provide button and keyboard alternatives for core actions and announce swipe results to assistive technology.
- The implementer chooses gesture thresholds, animations, and keyboard shortcuts, then checks for unintended actions on real devices.

## Subscriptions and Fetching

- Register an RSS/Atom URL only after successfully fetching and parsing the feed.
- Distinguish successful registration, duplicate URLs, invalid URLs, network failures, HTTP errors, timeouts,
  and invalid feed formats with understandable feedback.
- Detect duplicates by normalized URL. Full identity resolution across different alias URLs is excluded.
- Refresh automatically when the app opens. (An explicit refresh-all control was removed during the visual refresh.)
- Expose each source's loading, success, or failure state, failure reason, and last successful fetch time.
- Display successful stories without waiting for other sources to finish.
- Keep successful results visible when another source fails. Allow retrying failed sources individually.
- Refresh failures must not delete existing stories or selection records. Identify retained data as stale.
- Distinguish no subscriptions, loading, no stories, all stories processed, partial failure, and total failure.

## Data and Queue Policies

The following are proposed implementation choices for details not specified by the user.

- Identify stories by source and feed item ID, falling back to the normalized original link.
  When neither exists, omit the item from clickable cards and disclose that some source items were excluded.
- Initialize the queue in descending publication-date order. Label missing or invalid dates as unavailable and place those stories last.
- Add newly fetched stories without duplicates. Preserve the relative order of existing queued stories,
  including deferrals, and prepend only new stories.
- Do not requeue stories already bookmarked, stored, or dropped when they appear in later fetches.
- Persisted encoding (unchanged since v1, so no migration): bookmarked = `saved` (id → time); stored = `skipped` ids
  that also have an `interests` (id → time) mark; dropped = `skipped` ids without one.
- Restore the queue, all three categories, and last successful results after page reloads.
- Keep undo history for the current session; snapshots include stored marks so undoing 챙기기 fully reverts it.
  Clear history when a feed merge adds or prunes stories.
- Library groups are newest first (bookmark time, store time; dropped by choice order).
- Keep at most the newest 500 dropped stories (`MAX_ARCHIVED_STORIES`); bookmarked and stored are never pruned.
- Removing library entries or subscriptions is outside the currently confirmed scope.
- Report localStorage access failures, quota errors, and corruption instead of silently ignoring them.
  Corrupt data must not crash the interface or be automatically overwritten.
- Version the storage key (`joobjoob-reader-v1`; the pre-rename keys `seug-reader-v1` and `moa-reader-v1` are read as
  fallbacks). Do not build speculative account-storage abstractions.
- Keep persisted reader state in Zustand, with a provider-scoped store for Next.js rendering isolation.
  Hydrate localStorage only on the client and validate stored records before accepting them.
- Let SWR own request cache and revalidation. Merge successful results into the latest Zustand state
  for persistent browsing; do not let cached responses replace newer user selections.
- Use es-toolkit proactively for deduplication, ordering, indexing, and related operations where applicable.
  Prefer its native APIs over compatibility imports; do not wrap trivial operations just to use the package.

## Server and External Input

- Use a minimal Next.js Route Handler to return per-source fetch results. Keep selection and personal state off the server.
- Accept only HTTP(S) user-supplied URLs and reject credentials embedded in URLs.
- Block loopback, private, link-local, other internal networks, and cloud metadata endpoints.
  Validate DNS results and every redirect destination, and prevent bypasses between address validation and connection.
- Bound request duration, response size, redirect count, fetch concurrency, and parsed item count.
- Disable XML external entities and never insert external HTML directly into the page.
- Render titles and descriptions as plain text. Accept only HTTP(S) original links.
- Prefer installed tools. Use established dependencies where handwritten RSS/Atom parsing or SSRF defenses would be risky.
  Document dependency choices and limits in the implementation plan.
- Verify current Next.js APIs against installed documentation and Context7.

## Validation and Exclusions

- Test RSS/Atom parsing, invalid input, internal-network blocking, and time and size limits.
- Test queue insertion, deduplication, deferral, bookmark/store/drop, library grouping, undo, and browser-state restoration.
- Check per-source partial success, retries, empty states, opening originals, and button/drag conflicts.
- Run Yarn test, lint, format:check, typecheck, and the production build.
- Use available browser tools to check mobile and desktop layouts and core flows; report anything unverified.
- Exclude login, AI recommendations, translation, newsletter ingestion, invitations, curated subscriptions,
  analytics infrastructure, and continuous background collection.
- Completing implementation does not itself authorize merging into main or closing the issue.
