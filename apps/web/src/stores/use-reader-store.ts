"use client";
import { useContext } from "react";
import { useStore } from "zustand";
import { ReaderContext } from "./reader-context";
import type { ReaderStoreApi } from "./reader-store";

export function useReaderStore<T>(
  selector: (state: ReturnType<ReaderStoreApi["getState"]>) => T,
): T {
  const store = useContext(ReaderContext);
  if (!store) throw new Error("ReaderProvider is missing");
  return useStore(store, selector);
}
