# Reader visual refresh proposal

> **Current state (2026-11-22):** this is a historical record, kept as written except for renamed paths.
> Since then: the project is 줍줍 (JOOBJOOB); routes are `/library` and `/subscriptions` (was `/saved`, `/settings`);
> shadcn/ui was replaced by the vendored Catalyst UI kit (`src/components/catalyst`) and all custom CSS classes by
> Tailwind utilities; Figma SVG assets were replaced by Heroicons; fonts are self-hosted Maru Buri (not Noto);
> the independent interest "heart" became 챙기기, one of three exclusive outcomes (bookmarked > stored > dropped).
> The up-to-date behavior is in [the design spec](2026-11-21-rss-swipe-reader-design.md).

Status: **Direction A selected; prototype revisions requested.** The user approved A's direction and requested the explicit corrections below. This remains a prototype scope, not an approved product implementation plan. No product code changes are authorized by this document.

The goal is a calm, finished RSS reader that makes one story easy to read and act on. Local purchased templates supply ideas only; they are not replacement applications. Tailwind Blue and neutral surfaces replace the old pink direction. All app and preview UI copy is Korean; project documents remain English.

## Selected approach and comparison

**A — Quiet reading surface (selected).** A compact desktop route sidebar contains only the identity, Explore, Saved with count, and Settings. On mobile, those three destinations become bottom navigation. A contained white story surface sits in a pale neutral canvas; settings and saved items use the same bounded visual language. Compass contributes route structure, Spotlight contributes title/source/date hierarchy, Salient contributes blue action and focus treatment, and Radiant contributes only its restrained white surface. This gives empty and populated settings a clear frame and keeps navigation easy to reach. It costs horizontal space on desktop and vertical space on mobile, so card height must account for navigation and feedback.

**B — Editorial column.** Compact top navigation and a centered single column use typography and rules to organize the reader, saved list, and settings. The same single story and five actions remain. This is lighter and leaves more screen area for content, but secondary routes and empty settings feel less anchored. B must be a real structural alternative, not a color variation of A.

Neither direction adds a source/status sidebar, dashboard statistics, marketing hero, decorative artwork, filtering, search, deletion, login, or other features. A is now the user's selected direction and remains the default. B may remain available as a secondary comparison; the user did not request its removal.

## Explicit feedback and existing composition sources

- Keep route content off the gray page canvas: contain Saved's heading, description, list and empty state in one white surface. Apply the same containment to Settings' heading, explanation, form, source states and browser-storage note. Gray remains the surrounding page canvas rather than the backing for these text sections.
- Compose existing template and installed UI elements; do not invent a new visual primitive or add decorative treatments. The exact outer surface source is `templates/radiant.zip` → `tailwind-plus-radiant/radiant-ts/src/app/login/page.tsx`: `rounded-xl bg-white shadow-md ring-1 ring-black/5` with inner `p-7 sm:p-11`. Reuse that surface composition for the two route bodies, changing only responsive width and spacing needed to fit the existing content. Do not copy its gradient, login controls or marketing footer.
- Compose Saved's source/title/date rows from `templates/spotlight.zip` → `tailwind-plus-spotlight/spotlight-ts/src/app/articles/page.tsx` (`Article`, using `Card.Title` / `Card.Eyebrow` from `src/components/Card.tsx`), without its optional decorative eyebrow. Retain existing divider rows from `src/app/library/page.tsx` and `src/app/subscriptions/page.tsx`, as represented by the prototype's `.saved-item` and `.source-row`. Retain the installed shadcn-style `src/components/ui/button.tsx`, `input.tsx` and `alert.tsx` for their existing roles in any eventual product change. There is no installed Card or Separator component in this app; do not add one for this revision. In the HTML mock, compose the equivalent existing markup/styles without adding dependencies.
- Remove the blue dot beside the story source `도시와 기술`, including its empty element and unused style. It has no meaning. Do not replace it with a badge, icon, accent line, category, or other decoration. Add no element without a content or interaction purpose.

These explicit prototype corrections can proceed without another design-choice round. Blue, A's navigation, one visible story and the five existing action meanings remain unchanged.

## Prototype to review

Revise the standalone, high fidelity HTML mock with A selected by default and optional B comparison outside the simulated application. Include navigable Explore, Saved, and Settings views, and populated/empty/partial-failure settings states selectable outside the app. Use synthetic Korean sample stories, one visible story at a time, inline Heroicons-style SVG, no CDN or added dependency, and no pink. Display a clear draft notice outside the app frame and keep any comparison choices connected to the visual companion's `toggleSelect`/`data-choice` helper.

Show actual responsive desktop and 390 × 844 mobile layouts. Keep long headlines and descriptions readable, all five action buttons visible and touch sized, and bottom navigation clear of action feedback. Approximate the existing demo actions: undo the last queue choice, skip, defer to the queue end, independently toggle interest without advancing, save and advance. Open the synthetic original link in a new tab. State clearly that demo interactions do not save real subscriptions or reading history. Validate mock navigation, action semantics and the main viewport fit; production tests are outside this prototype scope.

## Eventual application sequence, after visual approval

1. Establish blue/neutral color, typography, spacing, border, focus and reduced-motion tokens in `src/app/reader.css`; keep existing reusable controls.
2. Apply the chosen responsive route structure in `src/components/shell.tsx`, retaining active-route semantics, saved count and visible storage errors. Mount the application once across breakpoints.
3. Restyle `src/components/story-card.tsx`, preserving the single story, action meanings, drag identity guard, scrollable description, safe original link, keyboard exclusions, disabled/pressed states and live feedback. Recalculate available height for the chosen shell rather than retaining old fixed offsets.
4. Apply the same typography and contained/list surfaces to `src/app/library/page.tsx` and `src/app/subscriptions/page.tsx`. Retain date ordering, registration validation, busy and failure feedback, retry, retained-data wording and source timestamps.
5. Verify existing queue, interest, undo, persistence and feed behavior, then run the existing test, lint, format, typecheck and build commands. Check desktop/mobile navigation, long text, original links, storage errors and source failure/retry in a browser.

The intended product boundary is exactly those five presentation files. Keep `src/app/layout.tsx`, `src/stores/*`, `src/hooks/feed-sync.tsx`, parsing, storage models, API routes and their contracts unchanged. A broader change requires a concrete reason and a revised scope before implementation.

## Risks to resolve visually

Mobile bottom navigation consumes height: the action bar, long title, description scroll area, live status and refresh/error links must remain reachable without clipping. Touch scrolling in the description must not become a swipe selection. Settings should scroll normally when source rows or error text grow. Preserve hydration and storage-error feedback so a temporary initial empty view does not imply data loss. A static mock can establish fit and hierarchy; it cannot prove real pointer, feed or persistence behavior.
