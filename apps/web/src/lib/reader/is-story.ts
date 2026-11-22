import { isHttpUrl } from "./is-http-url";
import { isRecord } from "./is-record";
import { isText } from "./is-text";
import { isTimestamp } from "./is-timestamp";
import type { Story } from "./types";

export function isStory(value: unknown): value is Story {
  return (
    isRecord(value) &&
    isText(value.id) &&
    isHttpUrl(value.sourceUrl) &&
    isText(value.sourceTitle) &&
    isText(value.title) &&
    typeof value.description === "string" &&
    isHttpUrl(value.url) &&
    (value.publishedAt === null || isTimestamp(value.publishedAt))
  );
}
