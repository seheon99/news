import { createStore } from "zustand/vanilla";
import {
  createInitialState,
  mergeFeed,
  parseStoredState,
  selectStory,
  serializeState,
  toggleInterest,
  type FeedResult,
  type ReaderState,
} from "../lib/reader.ts";

export const STORAGE_KEY = "moa-reader-v1";
type StorageAccess = Pick<Storage, "getItem" | "setItem">;
type Snapshot = Pick<ReaderState, "queue" | "saved" | "skipped">;
type ReaderStore = {
  data: ReaderState;
  hydrated: boolean;
  storageError: string | null;
  history: Snapshot[];
  hydrate: (storage: StorageAccess) => void;
  merge: (result: FeedResult) => void;
  choose: (action: "skip" | "save" | "defer") => void;
  undo: () => void;
  interest: () => void;
};

export function createReaderStore() {
  let storage: StorageAccess | null = null;
  let blocked = false;
  return createStore<ReaderStore>((set, get) => {
    function update(data: ReaderState, history = get().history) {
      set({ data, history });
      if (!storage || blocked) return;
      try {
        storage.setItem(STORAGE_KEY, serializeState(data));
      } catch {
        set({
          storageError:
            "저장 공간에 기록하지 못했어요. 브라우저 저장 공간을 확인해 주세요.",
        });
      }
    }
    return {
      data: createInitialState(),
      hydrated: false,
      storageError: null,
      history: [],
      hydrate: (disk) => {
        if (get().hydrated) return;
        storage = disk;
        try {
          const raw = disk.getItem(STORAGE_KEY);
          set({
            data: raw === null ? createInitialState() : parseStoredState(raw),
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
        update(
          next,
          next.queue.length !== current.queue.length ? [] : get().history,
        );
      },
      choose: (action) => {
        const { data, history } = get();
        if (!data.queue.length) return;
        const snapshot = {
          queue: data.queue,
          saved: data.saved,
          skipped: data.skipped,
        };
        update(selectStory(data, action), [...history, snapshot]);
      },
      undo: () => {
        const { data, history } = get();
        const snapshot = history.at(-1);
        if (snapshot) update({ ...data, ...snapshot }, history.slice(0, -1));
      },
      interest: () => {
        const { data } = get();
        const id = data.queue[0];
        if (id) update(toggleInterest(data, id, new Date().toISOString()));
      },
    };
  });
}
export type ReaderStoreApi = ReturnType<typeof createReaderStore>;
