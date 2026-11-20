"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import useSWR, { SWRConfig, useSWRConfig } from "swr";
import {
  createInitialState,
  mergeFeed,
  validateReaderState,
  type FeedResult,
} from "../lib/reader";
import { useReaderStore } from "../stores/reader-provider";

let active = 0;
const waiting: (() => void)[] = [];
export async function fetchFeed(url: string): Promise<FeedResult> {
  if (active >= 4) await new Promise<void>((resolve) => waiting.push(resolve));
  else active++;
  try {
    const response = await fetch("/api/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const value: unknown = await response.json();
    if (!response.ok)
      throw new Error(
        typeof value === "object" &&
          value !== null &&
          "message" in value &&
          typeof value.message === "string"
          ? value.message
          : "피드를 가져오지 못했어요.",
      );
    if (
      !value ||
      typeof value !== "object" ||
      !("source" in value) ||
      !("stories" in value)
    )
      throw new Error("피드 응답을 확인할 수 없어요.");
    const result = value as FeedResult;
    try {
      if (
        result.source.url !== url ||
        !Array.isArray(result.stories) ||
        result.stories.some((s) => s.sourceUrl !== url) ||
        !validateReaderState(mergeFeed(createInitialState(), result))
      )
        throw Error();
    } catch {
      throw new Error("피드 응답을 확인할 수 없어요.");
    }
    return result;
  } finally {
    const next = waiting.shift();
    if (next) next();
    else active--;
  }
}
type Status = {
  loading: boolean;
  error?: string;
  success?: boolean;
  failedAt?: string;
};
type FeedContextValue = {
  statuses: Record<string, Status>;
  setStatus: (url: string, status: Status) => void;
};
const FeedContext = createContext<FeedContextValue | null>(null);
export function useFeedStatus() {
  const value = useContext(FeedContext);
  if (!value) throw Error("FeedSync missing");
  return value.statuses;
}
export function useFeed(sourceUrl: string) {
  const hydrated = useReaderStore((s) => s.hydrated);
  const { setStatus } = useContext(FeedContext)!;
  const merge = useReaderStore((s) => s.merge);
  const feed = useSWR(hydrated ? sourceUrl : null, fetchFeed, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
    refreshInterval: 0,
    onSuccess: merge,
    onError: (error: Error) =>
      setStatus(sourceUrl, {
        loading: false,
        error: error.message,
        failedAt: new Date().toISOString(),
      }),
  });
  return feed;
}
function SourceSync({ url }: { url: string }) {
  const feed = useFeed(url);
  const context = useContext(FeedContext)!;
  // Updates are committed after render to avoid changing a parent during child rendering.
  const { setStatus } = context;
  useEffect(() => {
    setStatus(url, {
      loading: feed.isValidating,
      error: feed.error?.message,
      success: !!feed.data && !feed.error,
    });
  }, [url, feed.isValidating, feed.error, feed.data, setStatus]);
  return null;
}
function SyncChildren({ children }: { children: ReactNode }) {
  const sources = useReaderStore((s) => s.data.sources);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const setStatus = useCallback(
    (url: string, status: Status) =>
      setStatuses((old) => ({ ...old, [url]: { ...old[url], ...status } })),
    [],
  );
  return (
    <FeedContext.Provider value={{ statuses, setStatus }}>
      {sources.map((s) => (
        <SourceSync key={s.url} url={s.url} />
      ))}
      {children}
    </FeedContext.Provider>
  );
}
export function FeedSync({ children }: { children?: ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map() }}>
      <SyncChildren>{children}</SyncChildren>
    </SWRConfig>
  );
}
export function useFeedMutate() {
  return useSWRConfig().mutate;
}
