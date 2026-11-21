# Moa RSS Reader

Read RSS and Atom feeds one story at a time. Skip, save, or defer a story, mark interest independently, and undo the last selection. Open the original article in a new tab; saved stories are available on the saved page.

## Getting started

Use Node.js 24 and the Yarn version declared in `package.json` (Corepack can provide it):

```bash
corepack enable
yarn install
yarn dev
```

Open http://localhost:3000 and register a public RSS or Atom feed under subscription settings. There are no default subscriptions. The app refreshes sources on opening and supports manual refresh and individual retry.

Subscriptions, fetched stories, queue, saves, skips, and interests are stored in this browser's `moa-reader-v1` localStorage. They do not sync across devices or browsers. Undo history lasts for the current session and is cleared when a feed result changes the queue. Storage failures are displayed; corrupt data is preserved for backup rather than overwritten.

The server accepts public HTTP(S) feed URLs on ordinary ports, without embedded credentials. It blocks internal and private addresses, validates redirects and pins validated DNS addresses. Fetches have a 10-second total timeout, 2 MiB response limit, three redirects, 2,048-character URL limit, and a maximum of 100 stories per source. Up to eight upstream fetches run concurrently per server process. Feed HTML is rendered as plain text; items without a usable original link are excluded. Failed refreshes retain existing stories and show the failure and last successful fetch.

Accounts, AI recommendations, translation, newsletter ingestion, invitations, analytics, and continuous background polling are outside this implementation.

## Checks

```bash
yarn test
yarn lint
yarn format:check
yarn typecheck
yarn build
```

Use `yarn lint:fix` and `yarn format` to apply available formatting and lint fixes.
