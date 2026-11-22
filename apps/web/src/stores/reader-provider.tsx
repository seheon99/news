"use client";
import { type ReactNode, useEffect, useState } from "react";
import { FeedSync } from "@/components/feed-sync";
import { parseStoredState } from "@/lib/reader/parse-stored-state";
import { ReaderContext } from "./reader-context";
import { createReaderStore, STORAGE_KEY } from "./reader-store";

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
