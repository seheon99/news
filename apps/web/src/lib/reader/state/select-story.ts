import type { Choice, ReaderState } from "../types";

export function selectStory(
  state: ReaderState,
  action: Choice,
  now = new Date().toISOString(),
): ReaderState {
  const [id, ...rest] = state.queue;
  if (id === undefined) return state;
  if (action === "defer") return { ...state, queue: [...rest, id] };
  if (action === "save")
    return { ...state, queue: rest, saved: { ...state.saved, [id]: now } };
  const next = { ...state, queue: rest, skipped: [...state.skipped, id] };
  return action === "store"
    ? { ...next, interests: { ...state.interests, [id]: now } }
    : next;
}
