"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useStore } from "zustand";
import { createReaderStore, type ReaderStoreApi } from "./reader-store";
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
  return (
    <ReaderContext.Provider value={store}>
      <FeedSync>{children}</FeedSync>
    </ReaderContext.Provider>
  );
}
