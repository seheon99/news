"use client";
import { type ReactNode, useEffect } from "react";
import { SWRConfig } from "swr";
import { SourceSync } from "@/components/source-sync";
import { parseStoredState } from "@/lib/reader/parse-stored-state";
import { STORAGE_KEY } from "@/stores/reader-store";
import { readerStore, useReaderStore } from "@/stores/use-reader-store";

export function FeedSync({ children }: { children?: ReactNode }) {
  const sources = useReaderStore((s) => s.data.sources);
  useEffect(() => {
    try {
      readerStore.getState().hydrate(window.localStorage);
    } catch {
      readerStore.getState().hydrate({
        getItem: () => {
          throw Error("storage unavailable");
        },
        setItem: () => {},
      });
    }
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY || e.newValue === null) return;
      try {
        readerStore.setState({
          data: parseStoredState(e.newValue),
          history: [],
        });
      } catch {}
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return (
    <SWRConfig value={{ provider: () => new Map() }}>
      {sources.map((s) => (
        <SourceSync key={s.url} url={s.url} />
      ))}
      {children}
    </SWRConfig>
  );
}
