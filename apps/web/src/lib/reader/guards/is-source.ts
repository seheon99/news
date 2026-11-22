import type { Source } from "../types";
import { isHttpUrl } from "./is-http-url";
import { isRecord } from "./is-record";
import { isText } from "./is-text";
import { isTimestamp } from "./is-timestamp";

export function isSource(value: unknown): value is Source {
  return (
    isRecord(value) &&
    isHttpUrl(value.url) &&
    isText(value.title) &&
    (value.lastFetchedAt === null || isTimestamp(value.lastFetchedAt)) &&
    typeof value.excludedCount === "number" &&
    Number.isSafeInteger(value.excludedCount) &&
    value.excludedCount >= 0
  );
}
