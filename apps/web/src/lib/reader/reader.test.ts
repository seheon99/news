import assert from "node:assert/strict";
import { test } from "vitest";
import { createInitialState } from "./state/create-initial-state";
import { libraryGroups } from "./state/library-groups";
import { MAX_ARCHIVED_STORIES, mergeFeed } from "./state/merge-feed";
import { selectStory } from "./state/select-story";
import { parseStoredState } from "./storage/parse-stored-state";
import { validateReaderState } from "./storage/validate-reader-state";
import type { ReaderState, Source, Story } from "./types";

const time = "2026-11-21T00:00:00.000Z";
const source: Source = {
  url: "https://example.com/feed",
  title: "Example",
  lastFetchedAt: time,
  excludedCount: 2,
};

function story(id: string, publishedAt: string | null = time): Story {
  return {
    id,
    sourceUrl: source.url,
    sourceTitle: source.title,
    title: `Story ${id}`,
    description: "Plain text",
    url: `https://example.com/${id}`,
    publishedAt,
  };
}

function state(): ReaderState {
  return {
    version: 1,
    sources: [source],
    stories: { a: story("a"), b: story("b"), c: story("c") },
    queue: ["a", "b", "c"],
    saved: {},
    skipped: [],
    interests: {},
  };
}

test("initial states do not share mutable collections", () => {
  const first = createInitialState();
  first.queue.push("a");
  assert.deepEqual(createInitialState(), {
    version: 1,
    sources: [],
    stories: {},
    queue: [],
    saved: {},
    skipped: [],
    interests: {},
  });
});

test("deferral moves only the current story to the end without mutating input", () => {
  const before = state();
  const after = selectStory(before, "defer");
  assert.deepEqual(after.queue, ["b", "c", "a"]);
  assert.deepEqual(before, state());
});

test("deferring the last story keeps it available", () => {
  assert.deepEqual(selectStory({ ...state(), queue: ["a"] }, "defer").queue, [
    "a",
  ]);
});

test("saving removes the current story and records the current timestamp", () => {
  const before = state();
  const started = Date.now();
  const after = selectStory(before, "save");
  assert.deepEqual(after.queue, ["b", "c"]);
  assert.ok(Date.parse(after.saved.a) >= started);
  assert.ok(Date.parse(after.saved.a) <= Date.now());
  assert.deepEqual(before, state());
});

test("skipping records the current story without changing saved stories", () => {
  const before = state();
  const after = selectStory(before, "skip");
  assert.deepEqual(after.queue, ["b", "c"]);
  assert.deepEqual(after.skipped, ["a"]);
  assert.deepEqual(after.saved, {});
  assert.deepEqual(before, state());
});

test("selection on an empty queue leaves state unchanged", () => {
  const before = createInitialState();
  for (const action of ["skip", "store", "save", "defer"] as const) {
    assert.deepEqual(selectStory(before, action), before);
  }
});

test("store (챙기기) moves the story out of the queue and marks it for later", () => {
  const before = state();
  const after = selectStory(before, "store", time);
  assert.deepEqual(after.queue, ["b", "c"]);
  assert.deepEqual(after.skipped, ["a"]);
  assert.deepEqual(after.interests, { a: time });
  assert.deepEqual(after.saved, {});
  assert.deepEqual(before.interests, {});
  assert.ok(validateReaderState(after));
});

test("library groups bookmarked > stored > dropped, each newest first", () => {
  const later = "2026-11-22T00:00:00.000Z";
  let s: ReaderState = {
    ...state(),
    stories: { ...state().stories, d: story("d") },
  };
  s = { ...s, queue: ["a", "b", "c", "d"] };
  s = selectStory(s, "skip");
  s = selectStory(s, "store", time);
  s = selectStory(s, "save", time);
  s = selectStory(s, "store", later);
  const groups = libraryGroups(s);
  const ids = (list: { story: Story }[]) => list.map((e) => e.story.id);
  assert.deepEqual(Object.keys(groups), ["bookmarked", "stored", "dropped"]);
  assert.deepEqual(ids(groups.bookmarked), ["c"]);
  assert.deepEqual(ids(groups.stored), ["d", "b"]);
  assert.deepEqual(ids(groups.dropped), ["a"]);
});

test("new stories prepend in descending publication order and missing dates sort last", () => {
  const before = selectStory(state(), "defer");
  const after = mergeFeed(before, {
    source,
    stories: [
      story("missing", null),
      story("older", "2026-11-19T00:00:00.000Z"),
      story("newer", "2026-11-20T00:00:00.000Z"),
    ],
  });
  assert.deepEqual(after.queue, ["newer", "older", "missing", "b", "c", "a"]);
  assert.deepEqual(before.queue, ["b", "c", "a"]);
});

test("repeated results preserve deferral order and use the first duplicate item", () => {
  const before = selectStory(state(), "defer");
  const result = {
    source,
    stories: [
      story("d"),
      { ...story("d"), title: "Second duplicate" },
      story("a"),
    ],
  };
  const after = mergeFeed(before, result);
  assert.deepEqual(after.queue, ["d", "b", "c", "a"]);
  assert.equal(after.stories.d.title, "Story d");
  assert.deepEqual(mergeFeed(after, result), after);
});

test("refresh never requeues saved or skipped stories", () => {
  const before = selectStory(selectStory(state(), "save"), "skip");
  const after = mergeFeed(before, {
    source,
    stories: [story("a"), story("b"), story("d")],
  });
  assert.deepEqual(after.queue, ["d", "c"]);
  assert.deepEqual(after.saved, before.saved);
  assert.deepEqual(after.skipped, ["b"]);
});

test("merge updates source metadata and story text without deleting retained stories", () => {
  const before = state();
  const updatedSource = {
    ...source,
    lastFetchedAt: "2026-11-22T00:00:00.000Z",
    excludedCount: 5,
  };
  const after = mergeFeed(before, {
    source: updatedSource,
    stories: [{ ...story("a"), title: "Updated" }],
  });
  assert.deepEqual(after.sources, [updatedSource]);
  assert.equal(after.stories.a.title, "Updated");
  assert.deepEqual(after.stories.b, story("b"));
  assert.deepEqual(before, state());
});

test("merging a new subscription retains existing source results", () => {
  const second = {
    ...source,
    url: "https://second.example/feed",
    title: "Second",
  };
  const after = mergeFeed(state(), {
    source: second,
    stories: [
      { ...story("d"), sourceUrl: second.url, sourceTitle: second.title },
    ],
  });
  assert.deepEqual(after.sources, [source, second]);
  assert.deepEqual(after.queue, ["d", "a", "b", "c"]);
});

test("storage round-trips queue order, stored marks, and source fetch metadata", () => {
  const before = selectStory(selectStory(state(), "defer"), "store", time);
  assert.deepEqual(parseStoredState(JSON.stringify(before)), before);
  assert.ok(validateReaderState(before));
});

test("storage rejects malformed JSON and unsupported versions", () => {
  assert.throws(() => parseStoredState("{"));
  assert.throws(() =>
    parseStoredState(JSON.stringify({ ...state(), version: 2 })),
  );
});

test("storage rejects malformed records instead of accepting partial state", () => {
  const invalid = [
    null,
    [],
    {},
    { ...state(), queue: ["missing"] },
    { ...state(), queue: ["a", "a"] },
    { ...state(), saved: { a: "invalid date" }, queue: ["b", "c"] },
    { ...state(), skipped: ["a"], queue: ["a", "b", "c"] },
    { ...state(), saved: { a: time }, skipped: ["a"], queue: ["b", "c"] },
    { ...state(), interests: { missing: time } },
    { ...state(), stories: { wrong: story("a") } },
    {
      ...state(),
      stories: { a: { ...story("a"), publishedAt: "not a date" } },
    },
    { ...state(), sources: [{ ...source, excludedCount: -1 }] },
    { ...state(), sources: [{ ...source, lastFetchedAt: "invalid" }] },
    { ...state(), sources: [source, source] },
    { ...state(), sources: [] },
  ];
  for (const value of invalid) {
    assert.equal(validateReaderState(value), false);
    assert.throws(() => parseStoredState(JSON.stringify(value)));
  }
});

test("storage rejects unsafe story and source URLs, including embedded credentials", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,test",
    "/relative",
    "https://user:pass@example.com",
  ]) {
    const unsafeStory = {
      ...state(),
      stories: { ...state().stories, a: { ...story("a"), url } },
    };
    const unsafeSource = { ...state(), sources: [{ ...source, url }] };
    assert.throws(() => parseStoredState(JSON.stringify(unsafeStory)));
    assert.throws(() => parseStoredState(JSON.stringify(unsafeSource)));
  }
});

test("feed IDs matching object prototype properties keep their own story and interest records", () => {
  const before = mergeFeed(createInitialState(), {
    source,
    stories: [story("__proto__"), story("constructor")],
  });
  const after = selectStory(before, "store", time);
  assert.deepEqual(after.queue, ["constructor"]);
  assert.equal(Object.hasOwn(after.stories, "__proto__"), true);
  assert.equal(Object.hasOwn(after.interests, "__proto__"), true);
  assert.equal(
    Object.getOwnPropertyDescriptor(after.interests, "__proto__")?.value,
    time,
  );
  assert.deepEqual(parseStoredState(JSON.stringify(after)), after);
  assert.deepEqual(
    libraryGroups(after).stored.map((e) => e.story.id),
    ["__proto__"],
  );
});

test("merge prunes the oldest unmarked skipped stories and keeps saved and interested ones", () => {
  const ids = Array.from(
    { length: MAX_ARCHIVED_STORIES + 3 },
    (_, i) => `s${i}`,
  );
  const before: ReaderState = {
    ...state(),
    stories: Object.fromEntries(ids.map((id) => [id, story(id)])),
    queue: [],
    saved: { [ids[0]]: time },
    skipped: ids.slice(1),
    interests: { [ids[1]]: time },
  };
  const after = mergeFeed(before, { source, stories: [] });
  assert.ok(Object.hasOwn(after.saved, ids[0]));
  assert.ok(Object.hasOwn(after.stories, ids[0]));
  assert.ok(Object.hasOwn(after.stories, ids[1]));
  assert.equal(Object.hasOwn(after.stories, ids[2]), false);
  assert.ok(Object.hasOwn(after.stories, ids[3]));
  assert.equal(after.skipped.length, MAX_ARCHIVED_STORIES + 1);
  assert.ok(validateReaderState(after));
});

test("storage rejects orphan stories that would disappear from the reader", () => {
  assert.throws(() =>
    parseStoredState(JSON.stringify({ ...state(), queue: ["a", "b"] })),
  );
});
