import { isIdList } from "../guards/is-id-list";
import { isRecord } from "../guards/is-record";
import { isSource } from "../guards/is-source";
import { isStory } from "../guards/is-story";
import { isTimestampRecord } from "../guards/is-timestamp-record";
import type { ReaderState } from "../types";

export function validateReaderState(value: unknown): value is ReaderState {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !Array.isArray(value.sources) ||
    !value.sources.every(isSource) ||
    !isRecord(value.stories) ||
    !isIdList(value.queue) ||
    !isIdList(value.skipped) ||
    !isTimestampRecord(value.saved) ||
    !isTimestampRecord(value.interests)
  )
    return false;

  const { sources, stories, queue, skipped, saved, interests } = value;
  const sourceUrls = new Set(sources.map((source) => source.url));
  if (sourceUrls.size !== sources.length) return false;
  if (
    !Object.entries(stories).every(
      ([id, story]) =>
        isStory(story) && story.id === id && sourceUrls.has(story.sourceUrl),
    )
  )
    return false;

  const selected = new Set([...Object.keys(saved), ...skipped]);
  const represented = new Set([...queue, ...selected]);
  return (
    [
      ...queue,
      ...skipped,
      ...Object.keys(saved),
      ...Object.keys(interests),
    ].every((id) => Object.hasOwn(stories, id)) &&
    Object.keys(stories).every((id) => represented.has(id)) &&
    queue.every((id) => !selected.has(id)) &&
    skipped.every((id) => !Object.hasOwn(saved, id))
  );
}
