import { keyBy, orderBy, uniqBy } from "es-toolkit";

export type Source = {
  url: string;
  title: string;
  lastFetchedAt: string | null;
  excludedCount: number;
};

export type Story = {
  id: string;
  sourceUrl: string;
  sourceTitle: string;
  title: string;
  description: string;
  url: string;
  publishedAt: string | null;
};

export type FeedResult = { source: Source; stories: Story[] };

export type ReaderState = {
  version: 1;
  sources: Source[];
  stories: Record<string, Story>;
  queue: string[];
  saved: Record<string, string>;
  skipped: string[];
  interests: Record<string, string>;
};

export function createInitialState(): ReaderState {
  return {
    version: 1,
    sources: [],
    stories: {},
    queue: [],
    saved: {},
    skipped: [],
    interests: {},
  };
}

export function selectStory(
  state: ReaderState,
  action: "skip" | "save" | "defer",
): ReaderState {
  const [id, ...rest] = state.queue;
  if (id === undefined) return state;
  if (action === "defer") return { ...state, queue: [...rest, id] };
  if (action === "save") {
    return {
      ...state,
      queue: rest,
      saved: { ...state.saved, [id]: new Date().toISOString() },
    };
  }
  return { ...state, queue: rest, skipped: [...state.skipped, id] };
}

export function toggleInterest(
  state: ReaderState,
  id: string,
  now: string,
): ReaderState {
  if (!Object.hasOwn(state.stories, id)) return state;
  const interests = { ...state.interests, [id]: now };
  if (Object.hasOwn(state.interests, id)) delete interests[id];
  return { ...state, interests };
}

// ponytail: only the newest MAX_ARCHIVED_STORIES skipped stories without an interest mark are kept; an older one can reappear if a feed still lists it. Raise the cap or add an age limit if that happens.
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
    [
      (story) =>
        story.publishedAt === null ? -Infinity : Date.parse(story.publishedAt),
    ],
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function isSource(value: unknown): value is Source {
  return (
    isRecord(value) &&
    isHttpUrl(value.url) &&
    isText(value.title) &&
    (value.lastFetchedAt === null || isTimestamp(value.lastFetchedAt)) &&
    typeof value.excludedCount === "number" &&
    Number.isSafeInteger(value.excludedCount) &&
    value.excludedCount >= 0
  );
}

function isStory(value: unknown): value is Story {
  return (
    isRecord(value) &&
    isText(value.id) &&
    isHttpUrl(value.sourceUrl) &&
    isText(value.sourceTitle) &&
    isText(value.title) &&
    typeof value.description === "string" &&
    isHttpUrl(value.url) &&
    (value.publishedAt === null || isTimestamp(value.publishedAt))
  );
}

function isIdList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(isText) &&
    new Set(value).size === value.length
  );
}

function isTimestampRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every(isTimestamp);
}

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

export function parseStoredState(value: string): ReaderState {
  const state: unknown = JSON.parse(value);
  if (!validateReaderState(state))
    throw new Error("Invalid or unsupported reader state");
  return state;
}

export function serializeState(state: ReaderState): string {
  return JSON.stringify(state);
}
