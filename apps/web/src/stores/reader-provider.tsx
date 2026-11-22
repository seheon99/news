"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useStore } from "zustand";
import {
  createReaderStore,
  STORAGE_KEY,
  type ReaderStoreApi,
} from "./reader-store";
import { parseStoredState } from "../lib/reader";
import { FeedSync } from "../hooks/feed-sync";

const ReaderContext = createContext<ReaderStoreApi | null>(null);
export function useReaderStore<T>(
  selector: (state: ReturnType<ReaderStoreApi["getState"]>) => T,
): T {
  const store = useContext(ReaderContext);
  if (!store) throw new Error("ReaderProvider is missing");
  return useStore(store, selector);
}
export function ReaderProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createReaderStore);
  useEffect(() => {
    try {
      store.getState().hydrate(window.localStorage);
    } catch {
      store.getState().hydrate({
        getItem: () => {
          throw Error("storage unavailable");
        },
        setItem: () => {},
      });
    }
  }, [store]);
  useEffect(() => {
    // Another tab wrote new state: adopt it without writing back to storage.
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY || e.newValue === null) return;
      try {
        store.setState({ data: parseStoredState(e.newValue), history: [] });
      } catch {
        // Ignore values this build cannot validate; the local state stays as is.
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [store]);
  return (
    <ReaderContext.Provider value={store}>
      <FeedSync>{children}</FeedSync>
    </ReaderContext.Provider>
  );
}
