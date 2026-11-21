# Issue 2 reader visual review

See the [historical UI design audit](ui-design-audit.md) for the visible UI Tips inventory assessed before the Figma refresh.

Images prefixed `implemented-` show the running application after the [Figma refresh](https://www.figma.com/design/OoCUpQ24pBnkjYjsEm3vnD/news?node-id=5-2). The cream canvas, serif article text, rounded cards, and bottom tabs follow the supplied design. Existing five actions, saved list, and RSS behavior remain unchanged; unsupported library filters and newsletter inbox controls are omitted. Full Noto Sans KR and Noto Serif KR variable fonts are self-hosted with OFL licenses (9.3 MiB combined).

Images prefixed `design-a-` retain the earlier standalone Blue v4 proposal for historical comparison. That proposal was superseded by the supplied Figma design.

The live app screenshots use synthetic Korean stories stored in the browser's `moa-reader-v1` state. Requests to `/api/feed` were intercepted locally and returned a controlled sample error for the failure view. No Gmail account, personal feed, or real subscription was used. The prototype's settings failure and saved states are its own interactive sample data.

Viewports: desktop 1440×1000; reader mobile 390×844; empty settings mobile 420×912. Screenshots were captured with Chromium at device scale factor 1. They show the initial reader, saved content, and settings states without scrolling.

Regression checks also cover long content at 320×740. During a held 120px right drag at 390px, document width remains 390px; removing the clipping class in the browser reproduces 519px document width. Source-region left/right/up drags skip/save/defer at mobile and desktop widths. Emulated touch scrolling moves both title and description independently. Focused text arrow keys leave the queue unchanged; body-level ArrowUp and ArrowRight still defer and save. Physical devices were not tested.

## Current application

- [Reader · desktop](screenshots/implemented-reader-desktop.png)
- [Reader · mobile](screenshots/implemented-reader-mobile.png)
- [Saved stories · desktop](screenshots/implemented-saved-desktop.png)
- [Settings with controlled feed failure · desktop](screenshots/implemented-settings-failure-desktop.png)
- [Empty settings · mobile](screenshots/implemented-settings-empty-mobile.png)

## Blue v4 design proposal

Historical reference, superseded by Figma.

- [Reader · desktop](screenshots/design-a-reader-desktop.png)
- [Reader · mobile](screenshots/design-a-reader-mobile.png)
- [Saved stories · mobile](screenshots/design-a-saved-mobile.png)
- [Settings with sample failure · mobile](screenshots/design-a-settings-failure-mobile.png)
