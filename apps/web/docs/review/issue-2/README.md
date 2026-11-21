# Issue 2 mobile visual review

The screenshots below show the current application after the [Figma refresh](https://www.figma.com/design/OoCUpQ24pBnkjYjsEm3vnD/news?node-id=5-2) and mobile-only refinement. Every capture uses a **390×844** viewport at device scale factor 1. The application uses a mobile layout capped at 420px. Feed no longer has a refresh-all control.

Captures use synthetic Korean stories in an isolated browser context. Requests to `/api/feed` are intercepted for controlled success/failure states. No Gmail account, personal feed, real subscription, or existing browser storage is used. Fonts finish loading before capture and the development badge is hidden.

Typography uses self-hosted Maru Buri Regular (400), SemiBold (600), and Bold (700) throughout the application. The unmodified WOFF2 files come from [Naver's official distribution](https://hangeul.pstatic.net/hangeul_static/css/maru-buri.css), with the [copyright notice and OFL license](../../../public/fonts/MaruBuri-OFL.txt) included. They replace the previous Noto fonts.

## Current application

Feed actions use icon-only Undo, Defer, and Save controls, with wider text buttons for Skip and Collect (챙기기). Collect retains the independent selection toggle and uses an archive icon. The story footer shows only the source on the left and publication date on the right; tapping the card still opens the original article.

Saved cards also place the source and date at opposite footer edges without an extra original-article label or decorative arrow. Subscription rows follow the Figma RSS list composition; failures use concise guidance and retry instead of technical errors or collection history.

- [Feed](screenshots/implemented-reader-mobile.png)
- [Saved stories](screenshots/implemented-saved-mobile.png)
- [Subscriptions with controlled feed failure](screenshots/implemented-settings-failure-mobile.png)
- [Empty subscriptions](screenshots/implemented-settings-empty-mobile.png)

## Verification scope

The refreshed feed capture must contain no `전체 새로고침` control. All four pages must have document width equal to the 390px viewport. Browser emulation does not establish physical-device behavior.

## Blue v4 design proposal

The previous Blue proposal was superseded by Figma. Its screenshots and desktop captures are removed from this review. The [historical UI design audit](ui-design-audit.md) remains a snapshot of an earlier commit, not an assessment of the current application.
