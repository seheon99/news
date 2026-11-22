"use client";
import { useEffect } from "react";
import { useFeed } from "@/hooks/use-feed";
import { useReaderStore } from "@/stores/use-reader-store";

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
