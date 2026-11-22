"use client";
import useSWR from "swr";
import { fetchFeed } from "@/lib/feed/fetch-feed";
import { useReaderStore } from "@/stores/use-reader-store";

export function useFeed(sourceUrl: string) {
  const hydrated = useReaderStore((s) => s.hydrated);
  const merge = useReaderStore((s) => s.merge);
  const feed = useSWR(hydrated ? sourceUrl : null, fetchFeed, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    shouldRetryOnError: false,
    refreshInterval: 0,
    onSuccess: merge,
  });
  return feed;
}
