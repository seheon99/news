import { keyBy, orderBy, uniqBy } from "es-toolkit";
import type { FeedResult, ReaderState } from "../types";
import { publishedTime } from "./published-time";

export const MAX_ARCHIVED_STORIES = 500;

export function mergeFeed(state: ReaderState, result: FeedResult): ReaderState {
  const stories = uniqBy(result.stories, (story) => story.id);
  const skipped = new Set(state.skipped);
  const additions = orderBy(
    stories.filter(
      (story) =>
        !Object.hasOwn(state.stories, story.id) &&
        !Object.hasOwn(state.saved, story.id) &&
        !skipped.has(story.id),
    ),
    [publishedTime],
    ["desc"],
  );
  const next: ReaderState = {
    ...state,
    sources: Object.values({
      ...keyBy(state.sources, (source) => source.url),
      [result.source.url]: result.source,
    }),
    stories: {
      ...state.stories,
      ...Object.fromEntries(stories.map((story) => [story.id, story])),
    },
    queue: [...additions.map((story) => story.id), ...state.queue],
  };
  const pruned = new Set(
    next.skipped
      .filter((id) => !Object.hasOwn(next.interests, id))
      .slice(0, -MAX_ARCHIVED_STORIES),
  );
  if (!pruned.size) return next;
  return {
    ...next,
    stories: Object.fromEntries(
      Object.entries(next.stories).filter(([id]) => !pruned.has(id)),
    ),
    skipped: next.skipped.filter((id) => !pruned.has(id)),
  };
}
