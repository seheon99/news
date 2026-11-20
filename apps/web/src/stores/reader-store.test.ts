import { test } from "node:test";
import assert from "node:assert/strict";
import { createReaderStore, STORAGE_KEY } from "./reader-store.ts";

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
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      if (fail) throw Error("quota");
      value = next;
    },
    read: () => value,
  };
}

test("stores are isolated and restore persisted selection", () => {
  const disk = storage();
  const a = createReaderStore();
  const b = createReaderStore();
  a.getState().hydrate(disk);
  b.getState().hydrate(storage());
  a.getState().merge(result(["one", "two"]));
  a.getState().choose("save");
  assert.deepEqual(b.getState().data.queue, []);
  const restored = createReaderStore();
  restored.getState().hydrate(disk);
  assert.deepEqual(restored.getState().data.queue, ["two"]);
  assert.ok(restored.getState().data.saved.one);
  assert.ok(STORAGE_KEY);
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

test("undo preserves interest and late feeds never revive selections or orphan new stories", () => {
  const store = createReaderStore();
  store.getState().hydrate(storage());
  store.getState().merge(result(["one", "two"]));
  store.getState().interest();
  store.getState().choose("skip");
  store.getState().merge(result(["one", "two"]));
  assert.deepEqual(store.getState().data.queue, ["two"]);
  store.getState().undo();
  assert.deepEqual(store.getState().data.queue, ["one", "two"]);
  assert.ok(store.getState().data.interests.one);
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
