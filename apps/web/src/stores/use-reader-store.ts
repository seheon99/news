"use client";
import { useStore } from "zustand";
import { createReaderStore, type ReaderStoreApi } from "./reader-store";

export const readerStore = createReaderStore();

export function useReaderStore<T>(
  selector: (state: ReturnType<ReaderStoreApi["getState"]>) => T,
): T {
  return useStore(readerStore, selector);
}
