import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createReaderStore,
  LEGACY_STORAGE_KEYS,
  STORAGE_KEY,
} from "./reader-store.ts";

const source = {
  url: "https://example.com/feed",
  title: "Example",
  lastFetchedAt: "2026-01-01T00:00:00.000Z",
  excludedCount: 0,
};
const story = (id: string) => ({
  id,
  sourceUrl: source.url,
  sourceTitle: source.title,
  title: id,
  description: "",
  url: `https://example.com/${id}`,
  publishedAt: null,
});
const result = (ids: string[]) => ({ source, stories: ids.map(story) });
function storage(initial: string | null = null, fail = false) {
  const values = new Map(initial === null ? [] : [[STORAGE_KEY, initial]]);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, next: string) => {
      if (fail) throw Error("quota");
      values.set(key, next);
    },
    read: () => values.get(STORAGE_KEY) ?? null,
  };
}

test("reload restores every selection and source record, but starts with no undo history", () => {
  const disk = storage();
  const store = createReaderStore();
  const isolated = createReaderStore();
  store.getState().hydrate(disk);
  isolated.getState().hydrate(storage());
  store.getState().merge(result(["one", "two", "three", "four"]));
  store.getState().choose("save");
  store.getState().choose("skip");
  store.getState().choose("defer");
  store.getState().choose("store");
  const beforeReload = store.getState().data;
  assert.deepEqual(beforeReload.queue, ["three"]);
  assert.deepEqual(Object.keys(beforeReload.saved), ["one"]);
  assert.deepEqual(beforeReload.skipped, ["two", "four"]);
  assert.deepEqual(Object.keys(beforeReload.interests), ["four"]);
  assert.deepEqual(beforeReload.sources, [source]);
  assert.deepEqual(isolated.getState().data.queue, []);
  assert.equal(disk.read(), JSON.stringify(beforeReload));
  const restored = createReaderStore();
  restored.getState().hydrate(disk);
  assert.deepEqual(restored.getState().data, beforeReload);
  assert.deepEqual(restored.getState().history, []);
  assert.equal(restored.getState().hydrated, true);
  assert.equal(restored.getState().storageError, null);
  restored.getState().undo();
  assert.deepEqual(restored.getState().data, beforeReload);
});

test("corrupt storage is preserved and write failures are visible", () => {
  const disk = storage("broken");
  const store = createReaderStore();
  store.getState().hydrate(disk);
  store.getState().merge(result(["one"]));
  assert.equal(disk.read(), "broken");
  assert.ok(store.getState().storageError);
  const failing = createReaderStore();
  failing.getState().hydrate(storage(null, true));
  failing.getState().merge(result(["one"]));
  assert.ok(failing.getState().storageError);
});

test("undo fully reverses 챙기기 and late feeds never revive selections or orphan new stories", () => {
  const store = createReaderStore();
  store.getState().hydrate(storage());
  store.getState().merge(result(["one", "two"]));
  store.getState().choose("store");
  store.getState().merge(result(["one", "two"]));
  assert.deepEqual(store.getState().data.queue, ["two"]);
  assert.ok(store.getState().data.interests.one);
  store.getState().undo();
  assert.deepEqual(store.getState().data.queue, ["one", "two"]);
  assert.deepEqual(store.getState().data.interests, {});
  store.getState().choose("defer");
  store.getState().undo();
  assert.deepEqual(store.getState().data.queue, ["one", "two"]);
  store.getState().choose("save");
  store.getState().merge(result(["one", "two", "three"]));
  store.getState().undo();
  assert.deepEqual(store.getState().data.queue, ["three", "two"]);
  assert.ok(store.getState().data.saved.one);
});

test("a selection bound to the dragged story cannot affect a newly prepended story", () => {
  const store = createReaderStore();
  store.getState().hydrate(storage());
  store.getState().merge(result(["one", "two"]));
  const draggedId = store.getState().data.queue[0];
  store.getState().merge(result(["one", "two", "three"]));
  assert.equal(store.getState().choose("skip", draggedId), false);
  assert.deepEqual(store.getState().data.queue, ["three", "one", "two"]);
  assert.deepEqual(store.getState().data.skipped, []);
  assert.equal(store.getState().choose("save", "three"), true);
  assert.deepEqual(store.getState().data.queue, ["one", "two"]);
  assert.ok(store.getState().data.saved.three);
});

for (const action of ["save", "store", "skip", "defer"] as const) {
  test(`undo reverses ${action} and persists the restored state`, () => {
    const disk = storage();
    const store = createReaderStore();
    store.getState().hydrate(disk);
    store.getState().merge(result(["one", "two", "three"]));
    const before = store.getState().data;
    assert.equal(store.getState().choose(action), true);
    assert.deepEqual(
      store.getState().data.queue,
      action === "defer" ? ["two", "three", "one"] : ["two", "three"],
    );
    assert.deepEqual(
      Object.keys(store.getState().data.saved),
      action === "save" ? ["one"] : [],
    );
    assert.deepEqual(
      store.getState().data.skipped,
      action === "skip" || action === "store" ? ["one"] : [],
    );
    assert.deepEqual(
      Object.keys(store.getState().data.interests),
      action === "store" ? ["one"] : [],
    );
    store.getState().undo();
    const expected = before;
    assert.deepEqual(store.getState().data, expected);
    assert.deepEqual(store.getState().history, []);
    const restored = createReaderStore();
    restored.getState().hydrate(disk);
    assert.deepEqual(restored.getState().data, expected);
  });
}

test("independently arriving feed results merge into the latest saved and deferred state", () => {
  const disk = storage();
  const store = createReaderStore();
  store.getState().hydrate(disk);
  store.getState().merge(result(["one", "two", "three"]));
  store.getState().choose("save");
  store.getState().choose("defer");
  const saved = store.getState().data.saved;
  const secondSource = {
    ...source,
    url: "https://other.example/feed",
    title: "Other",
  };
  const otherStory = {
    ...story("other"),
    sourceUrl: secondSource.url,
    sourceTitle: secondSource.title,
  };
  store.getState().merge({ source: secondSource, stories: [otherStory] });
  store.getState().merge(result(["one", "two", "three"]));
  assert.deepEqual(store.getState().data.queue, ["other", "three", "two"]);
  assert.deepEqual(store.getState().data.saved, saved);
  assert.deepEqual(store.getState().data.sources, [source, secondSource]);
  assert.deepEqual(store.getState().data.stories, {
    one: story("one"),
    two: story("two"),
    three: story("three"),
    other: otherStory,
  });
  assert.deepEqual(store.getState().history, []);
  const restored = createReaderStore();
  restored.getState().hydrate(disk);
  assert.deepEqual(restored.getState().data, store.getState().data);
});

test("blocked storage reads remain visible and are never followed by destructive writes", () => {
  const store = createReaderStore();
  let writes = 0;
  store.getState().hydrate({
    getItem: () => {
      throw Error("access denied");
    },
    setItem: () => {
      writes++;
    },
  });
  assert.equal(store.getState().hydrated, true);
  assert.equal(typeof store.getState().storageError, "string");
  store.getState().merge(result(["one", "two"]));
  store.getState().choose("save");
  store.getState().undo();
  assert.deepEqual(store.getState().data.queue, ["one", "two"]);
  assert.equal(writes, 0);
});

test("data saved under any pre-rename key is still loaded", () => {
  for (const legacyKey of LEGACY_STORAGE_KEYS) {
    const old = storage();
    const writer = createReaderStore();
    writer.getState().hydrate(old);
    writer.getState().merge(result(["one"]));
    const legacy = {
      getItem: (key: string) => (key === legacyKey ? old.read() : null),
      setItem: () => {},
    };
    const store = createReaderStore();
    store.getState().hydrate(legacy);
    assert.deepEqual(store.getState().data.queue, ["one"], legacyKey);
  }
});
