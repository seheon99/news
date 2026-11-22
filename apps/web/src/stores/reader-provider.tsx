"use client";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useStore } from "zustand";
import { FeedSync } from "../components/feed-sync";
import { parseStoredState } from "../lib/reader";
import {
  createReaderStore,
  type ReaderStoreApi,
  STORAGE_KEY,
} from "./reader-store";

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
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY || e.newValue === null) return;
      try {
        store.setState({ data: parseStoredState(e.newValue), history: [] });
      } catch {}
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
