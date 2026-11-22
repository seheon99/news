import type { ReaderState } from "../types";

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
