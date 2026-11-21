# Issue 2 reader visual review

See the [UI design audit](ui-design-audit.md) for the complete visible UI Tips inventory, findings, and remaining work.

The screenshots below document the current reader UI and a separate visual refresh proposal. Images prefixed `implemented-` come from the running application on this branch. Images prefixed `design-a-` come from the standalone Blue v4 proposal at `.superpowers/brainstorm/114014-1795240300/content/reader-blue-redesign-v4.html`; they are design references, not shipped UI.

The live app screenshots use synthetic Korean stories stored in the browser's `moa-reader-v1` state. Requests to `/api/feed` were intercepted locally and returned a controlled sample error for the failure view. No Gmail account, personal feed, or real subscription was used. The prototype's settings failure and saved states are its own interactive sample data.

Viewports: desktop 1440×1000; mobile 390×844. Screenshots were captured with Chromium at device scale factor 1. They show the initial reader, saved content, and settings states without scrolling.

## Current application

- [Reader · desktop](screenshots/implemented-reader-desktop.png)
- [Reader · mobile](screenshots/implemented-reader-mobile.png)
- [Saved stories · desktop](screenshots/implemented-saved-desktop.png)
- [Settings with controlled feed failure · desktop](screenshots/implemented-settings-failure-desktop.png)
- [Empty settings · mobile](screenshots/implemented-settings-empty-mobile.png)

## Blue v4 design proposal

- [Reader · desktop](screenshots/design-a-reader-desktop.png)
- [Reader · mobile](screenshots/design-a-reader-mobile.png)
- [Saved stories · mobile](screenshots/design-a-saved-mobile.png)
- [Settings with sample failure · mobile](screenshots/design-a-settings-failure-mobile.png)
