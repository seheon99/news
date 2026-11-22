"use client";
import { useEffect } from "react";
import { useFeed } from "@/hooks/feed-sync";
import { useReaderStore } from "@/stores/reader-provider";

export function SourceSync({ url }: { url: string }) {
  const feed = useFeed(url);
  const setStatus = useReaderStore((s) => s.setStatus);
  useEffect(() => {
    setStatus(url, {
      loading: feed.isValidating,
      error: feed.error?.message,
    });
  }, [url, feed.isValidating, feed.error, setStatus]);
  return null;
}
