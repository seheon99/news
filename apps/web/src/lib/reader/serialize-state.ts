import type { ReaderState } from "./types";

export function serializeState(state: ReaderState): string {
  return JSON.stringify(state);
}
