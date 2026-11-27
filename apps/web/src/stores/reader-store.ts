import { orderBy } from "es-toolkit";
import { createStore } from "zustand/vanilla";
import { createInitialState } from "@/lib/reader/state/create-initial-state";
import { mergeFeed } from "@/lib/reader/state/merge-feed";
import { publishedTime } from "@/lib/reader/state/published-time";
import { selectStory } from "@/lib/reader/state/select-story";
import { parseStoredState } from "@/lib/reader/storage/parse-stored-state";
import type { Choice, FeedResult, ReaderState } from "@/lib/reader/types";

export const STORAGE_KEY = "joobjoob-reader-v1";
export const LEGACY_STORAGE_KEYS = ["seug-reader-v1", "moa-reader-v1"];
type StorageAccess = Pick<Storage, "getItem" | "setItem">;
type Snapshot = Pick<ReaderState, "queue" | "saved" | "skipped" | "interests">;
export type FeedStatus = { loading: boolean; error?: string };
type ReaderStore = {
  data: ReaderState;
  statuses: Record<string, FeedStatus>;
  hydrated: boolean;
  storageError: string | null;
  history: Snapshot[];
  hydrate: (storage: StorageAccess) => void;
  merge: (result: FeedResult) => void;
  choose: (action: Choice, expectedId?: string) => boolean;
  isCurrent: (id: string) => boolean;
  undo: () => void;
  setStatus: (url: string, status: FeedStatus) => void;
};

export function createReaderStore() {
  let storage: StorageAccess | null = null;
  let blocked = false;
  return createStore<ReaderStore>((set, get) => {
    function update(data: ReaderState, history = get().history) {
      set({ data, history });
      if (!storage || blocked) return;
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        set({
          storageError:
            "저장 공간에 기록하지 못했어요. 브라우저 저장 공간을 확인해 주세요.",
        });
      }
    }
    return {
      data: createInitialState(),
      statuses: {},
      hydrated: false,
      storageError: null,
      history: [],
      hydrate: (disk) => {
        if (get().hydrated) return;
        storage = disk;
        try {
          const raw =
            [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]
              .map((key) => disk.getItem(key))
              .find((value) => value !== null) ?? null;
          const data =
            raw === null ? createInitialState() : parseStoredState(raw);
          set({
            // Deferral lasts one session, so a reload restores publication order.
            data: {
              ...data,
              queue: orderBy(
                data.queue.map((id) => data.stories[id]),
                [publishedTime],
                ["desc"],
              ).map((story) => story.id),
            },
            hydrated: true,
          });
        } catch {
          blocked = true;
          set({
            hydrated: true,
            storageError:
              "저장된 데이터를 읽지 못했어요. 브라우저의 사이트 데이터를 백업하고 확인해 주세요. 기존 데이터는 보존됩니다.",
          });
        }
      },
      merge: (result) => {
        const current = get().data;
        const next = mergeFeed(current, result);
        const changed =
          next.queue.length !== current.queue.length ||
          Object.keys(next.stories).length !==
            Object.keys(current.stories).length;
        update(next, changed ? [] : get().history);
      },
      isCurrent: (id) => get().data.queue[0] === id,
      choose: (action, expectedId) => {
        const { data, history } = get();
        if (
          !data.queue.length ||
          (action === "defer" && data.queue.length < 2) ||
          (expectedId !== undefined && data.queue[0] !== expectedId)
        )
          return false;
        const snapshot = {
          queue: data.queue,
          saved: data.saved,
          skipped: data.skipped,
          interests: data.interests,
        };
        update(selectStory(data, action), [...history, snapshot]);
        return true;
      },
      undo: () => {
        const { data, history } = get();
        const snapshot = history.at(-1);
        if (snapshot) update({ ...data, ...snapshot }, history.slice(0, -1));
      },
      setStatus: (url, status) =>
        set(({ statuses }) => ({ statuses: { ...statuses, [url]: status } })),
    };
  });
}
export type ReaderStoreApi = ReturnType<typeof createReaderStore>;
