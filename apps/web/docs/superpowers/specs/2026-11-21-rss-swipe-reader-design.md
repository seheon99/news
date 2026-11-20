# RSS Swipe Reader — Issue #2 Design

Status: Approved for implementation.
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
- Use Tailwind CSS and shadcn/ui for the interface, Zustand for browser-local reader state,
  SWR (`useSWR`) for feed request caching and revalidation, and es-toolkit for applicable data utilities.

## Screens

- `/`: One central card, top navigation for discovery, saved stories, and subscription settings, and a bottom circular action bar.
- `/saved`: A list of saved stories with links to their originals.
- `/settings`: RSS/Atom URL registration, subscribed sources, per-source fetch results, and individual retries.
- Do not keep a source-status sidebar visible during discovery. Show compact fetch progress and failure counts,
  linking failures to detailed results in settings. This is a proposed implementation choice to preserve card focus.
- Support mobile and desktop. Use Heroicons for icons.
- Use shadcn/ui components for shared controls and feedback, styled with Tailwind CSS.
  Configure Heroicons explicitly; do not introduce a second product icon library through component defaults.
- Do not invent images or generate summaries. Use text cards when an image is unavailable.
- Mockup examples come from individual TLDR Dev stories dated 2026-11-12, found in Gmail.
  Do not include Gmail account details, raw emails, tracking links, or unsubscribe links in the product.

## Card Actions

| Input                      | Result                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| Swipe left / Skip button   | Remove the story from the queue and record the skip                                          |
| Swipe right / Save button  | Add the story to saved stories and remove it from the queue                                  |
| Swipe up / Defer button    | Move the current story to the end of the same selection queue                                |
| Heart button               | Toggle interest while preserving the current card, queue position, and saved state           |
| Undo button                | Undo the previous skip, save, or defer and restore the queue and saved state                 |
| Card click / Read original | Open a safe HTTP(S) original link in a new tab without changing the queue or selection state |

- Interest is independent of saving. Record its timestamp and allow interest to be removed. AI recommendations are excluded.
- Undo does not modify interest. Disable undo when no selection history exists.
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
- Refresh automatically when the app opens and allow an explicit refresh of all sources.
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
- Do not requeue stories already saved or skipped when they appear in later fetches.
- Restore the queue, interests, saved stories, skipped stories, and last successful results after page reloads.
- Keep undo history for the current session. Clear it when a full refresh changes queue composition.
  Toggling interest or opening an original link does not clear selection history.
- Display saved stories in descending save-time order. Removing saved stories or subscriptions is outside the currently confirmed scope.
- Report localStorage access failures, quota errors, and corruption instead of silently ignoring them.
  Corrupt data must not crash the interface or be automatically overwritten.
- Version the storage key. Do not build speculative account-storage abstractions.
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
- Test queue insertion, deduplication, deferral, saving, undo, independent interest state, and browser-state restoration.
- Check per-source partial success, retries, empty states, opening originals, and button/drag conflicts.
- Run Yarn lint, format:check, typecheck, and the production build.
- Use available browser tools to check mobile and desktop layouts and core flows; report anything unverified.
- Exclude login, AI recommendations, translation, newsletter ingestion, invitations, curated subscriptions,
  analytics infrastructure, and continuous background collection.
- Completing implementation does not itself authorize merging into main or closing the issue.
