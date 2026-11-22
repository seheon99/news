import type { LibraryEntry, ReaderState } from "./types";

export function libraryGroups(state: ReaderState) {
  const entry = (id: string, at: string | null): LibraryEntry[] =>
    Object.hasOwn(state.stories, id) ? [{ story: state.stories[id], at }] : [];
  const byDate = (a: LibraryEntry, b: LibraryEntry) =>
    (b.at ?? "").localeCompare(a.at ?? "");
  const stored = (id: string) => Object.hasOwn(state.interests, id);
  return {
    bookmarked: Object.entries(state.saved)
      .flatMap(([id, at]) => entry(id, at))
      .sort(byDate),
    stored: state.skipped
      .filter(stored)
      .flatMap((id) => entry(id, state.interests[id]))
      .sort(byDate),
    dropped: state.skipped
      .filter((id) => !stored(id))
      .reverse()
      .flatMap((id) => entry(id, null)),
  };
}
