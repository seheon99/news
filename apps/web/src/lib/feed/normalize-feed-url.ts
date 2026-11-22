import ipaddr from "ipaddr.js";
import { createFeedError } from "./create-feed-error";
import { isPublic } from "./is-public";

export function normalizeFeedUrl(value: string): string {
  try {
    if (value.length > 2048) throw 0;
    const url = new URL(value);
    const host = url.hostname.replace(/^\[|\]$/g, "");
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.port ||
      host === "localhost" ||
      host.endsWith(".localhost") ||
      (ipaddr.isValid(host) && !isPublic(host))
    )
      throw 0;
    url.hash = "";
    if (url.href.length > 2048) throw 0;
    return url.href;
  } catch {
    throw createFeedError("INVALID_URL");
  }
}
