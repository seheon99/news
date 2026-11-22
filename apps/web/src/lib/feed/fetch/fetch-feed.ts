import { createInitialState } from "@/lib/reader/state/create-initial-state";
import { mergeFeed } from "@/lib/reader/state/merge-feed";
import { validateReaderState } from "@/lib/reader/storage/validate-reader-state";
import type { FeedResult } from "@/lib/reader/types";

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
