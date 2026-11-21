# Figma Reader Presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Apply the supplied Figma visual design to the working RSS reader while preserving its current behavior.

**Architecture:** Change the five existing presentation files. The shared shell owns the page header and three bottom tabs. Existing state, persistence, feed synchronization, gestures, route URLs, and security boundaries remain the implementation source of truth.

**Tech Stack:** Existing Next.js 16.4.6, React 19.3.0, Tailwind 4, Heroicons, Zustand, SWR; no new dependency.

**Spec:** Figma OoCUpQ24pBnkjYjsEm3vnD; fetched references /tmp/news-figma-{feed,library,subscriptions,empty,drag}.txt. User explicitly selected design-only adaptation with existing functionality.

## Global Constraints

- English communication and documentation; Korean user-facing UI.
- Preserve all five actions: undo, skip, defer to queue tail, independent interest heart, save and advance. Preserve arrow keys and Ctrl/Cmd+Z.
- Preserve /, /saved, /settings URLs, current data validation, localStorage key/version, failed-read write blocking, refresh/error information, and expected-story guard during dragging.
- No status-model migration, five status filters, newsletter inbox/address, authentication controls, fake device status bar, or home indicator.
- Preserve concurrent drag overflow fix in StoryCard.
- Read relevant installed Next.js guides before implementation. Follow AGENTS.md/RTK shell requirements.

## Review Focus

- At 320px, all five actions must remain reachable without horizontal page overflow.
- Long Korean/Latin titles and descriptions must wrap or scroll while metadata, controls, and bottom navigation stay reachable.
- Loading, no sources, all feeds failed, no fetched stories, and queue complete must retain distinct truthful copy.
- Old persisted state must restore without a migration or silent data reset.
- New feed arrival during a drag must not select the replacement article; undo must not orphan newly fetched stories.

### Task 1: Shared canvas, typography, page chrome

**Files:** src/app/reader.css; src/components/shell.tsx; public/fonts/noto-{serif,sans}-kr.woff2 and per-family OFL licenses.
**Interfaces:** Shell({children: ReactNode}) remains unchanged. Route header derives title/count from pathname and existing data: 받은 항목/queue count, 보관함/saved count, 구독/source count.

- [ ] Set canvas #f6f4eb, card #fffdf7, border #dcddd0, foreground #182b35, secondary #46534b and muted #647168; make existing UI variables match this restrained palette.
- [ ] Use Noto Sans KR for interface text and Noto Serif KR for article text, with system sans/serif fallbacks. Use locally vendored official Google Fonts variable WOFF2 files (serif 5,859,124 bytes; sans 3,908,348 bytes), full source glyph coverage and weight range 100–900, with per-family OFL licenses. Declare @font-face in reader.css with font-display:swap; no runtime CDN.
- [ ] Replace pink brand/top navigation with Figma 28px bold page title and real count, retaining accessible navigation labels. Keep the header setting link only where it resolves to existing /settings; omit a useless gear on /settings.
- [ ] Place three centered pill tabs near the bottom, labeled 피드, 보관함, 구독, using real Link navigation and aria-current. Keep a roughly 200–240px tab capsule with a subtle selected fill, sufficient target widths, and safe-area/content clearance.
- [ ] Center an approximately 470px reading column on desktop; use flexible padding (roughly 24px at design width) and min-height:100dvh without a fake mobile-device frame.
- [ ] Check the three routes at 320px, 420px, and desktop widths; verify title counts, focus rings, and bottom navigation do not overlap content.

### Task 2: Feed card and five actions

**Files:** src/components/story-card.tsx; shared rules in src/app/reader.css as needed.
**Interfaces:** Existing choose/action types, gestureAction, interest, undo, feed status/mutate, and expectedId guard are unchanged.

- [ ] Remove gradient source banner. Render the article inside a 20px rounded cream card with 24px padding and thin muted border; title uses 27px bold serif and description 20px medium serif at 1.45 line-height; source/date/original link use smaller sans metadata at the bottom.
- [ ] Keep description independently scrollable and preserve all pointer/click suppression handlers. Use viewport-aware flexible card height without clipping long content; retain reduced-motion behavior.
- [ ] Restyle the five existing controls as white bordered pills with monochrome icons, independent heart pressed state, existing labels/disabled states, and visible focus. Reuse downloaded public/figma SVG assets for matching cog, undo, discard, bookmark, complete, and refresh slots. Keep existing Heroicons for heart/defer, which have no matching Figma slot. Remove unused archive.svg if no implementation references it. At narrow widths use compact icon controls with accessible names; keep visible action labels only where they fit.
- [ ] Style empty/loading/error states using the same hierarchy without copying fake sample articles or collapsing their existing conditions. Keep live announcements, retry link, and whole-feed refresh usable.
- [ ] Run existing gesture/store tests and manually exercise each button, keyboard shortcut, drag direction, cancellation, independent heart, and undo. Confirm drag does not create document horizontal scroll.

### Task 3: Saved library and subscriptions

**Files:** src/app/saved/page.tsx; src/app/settings/page.tsx.
**Interfaces:** Existing saved timestamp ordering, RSS registration function, URL validation, fetchFeed, merge/mutate and source status shape remain unchanged.

- [ ] Remove duplicated page headings now owned by Shell. Render saved entries as 20px rounded cream panels with 18px padding and 12px spacing, 19px serif titles, and 11–13px sans source/save metadata. Show actual title only; do not invent a Korean translation or newsletter source. An optional static 저장됨 label may describe the sole list, but no fake filters.
- [ ] Render RSS-add form and registered sources as cream bordered cards following the Figma subscriptions hierarchy. Keep real URL label/input, registration busy/status message, duplicate detection, HTTP/HTTPS validation, and browser-local storage disclosure.
- [ ] Preserve per-source loading/failure, last-success/last-failure, excluded count, and retry control. Make long URLs wrap without overflow. No newsletter card or decorative non-working controls.
- [ ] Manually verify blank and populated library, invalid/duplicate feed address, registration success/error, and retry behavior.

### Task 4: Focused verification

- [ ] Run rtk yarn test; existing reader, store, gesture, fetch and API suites must pass without fixture/model changes.
- [ ] Run rtk yarn lint and rtk yarn typecheck; run production build once if fonts/assets or framework configuration changed.
- [ ] Inspect mobile and desktop screenshots for all three routes and empty/error states; check keyboard focus, button accessible names/pressed state, scrolling, and original-link safety attributes.
- [ ] Review final diff: only five presentation files plus intentionally added local font assets/license and used public/figma SVG assets should change; no state/backend/API edits and no obsolete blue-prototype assets.

## Decisions still requiring user input

None. The user selected preserve-existing-behavior scope. Official Noto KR fonts are now vendored with licenses; full source glyph coverage is preserved.
