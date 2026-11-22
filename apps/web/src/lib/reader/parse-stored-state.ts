import type { ReaderState } from "./types";
import { validateReaderState } from "./validate-reader-state";

export function parseStoredState(value: string): ReaderState {
  const state: unknown = JSON.parse(value);
  if (!validateReaderState(state))
    throw new Error("Invalid or unsupported reader state");
  return state;
}
