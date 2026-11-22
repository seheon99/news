import { createHash } from "node:crypto";
import { Parser as HtmlParser } from "htmlparser2";
import Parser from "rss-parser";
import { FeedError } from "./feed-url.ts";
import type { FeedResult, Story } from "./reader.ts";

function text(value: string | undefined): string {
  let output = "";
  let hidden = 0;
  const parser = new HtmlParser(
    {
      onopentag(name) {
        if (name === "script" || name === "style") hidden++;
        else if (!hidden) output += " ";
      },
      ontext(part) {
        if (!hidden) output += part;
      },
      onclosetag(name) {
        if (name === "script" || name === "style") hidden--;
        else if (!hidden) output += " ";
      },
    },
    { decodeEntities: true },
  );
  parser.end(value ?? "");
  return output.replace(/\s+/g, " ").trim();
}

export async function parseFeed(
  xml: string,
  sourceUrl: string,
  baseUrl = sourceUrl,
): Promise<FeedResult> {
  try {
    if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml)) throw 0;
    const feed = await new Parser().parseString(xml);
    const title = text(feed.title) || new URL(sourceUrl).hostname;
    const stories: Story[] = [];
    const seen = new Set<string>();
    let excludedCount = 0;
    for (const item of feed.items) {
      let url: URL;
      try {
        if (!item.link) throw 0;
        url = new URL(item.link, baseUrl);
        if (
          !["http:", "https:"].includes(url.protocol) ||
          url.username ||
          url.password
        )
          throw 0;
      } catch {
        excludedCount++;
        continue;
      }
      const id = createHash("sha256")
        .update(JSON.stringify([sourceUrl, item.guid || url.href]))
        .digest("hex");
      if (seen.has(id)) continue;
      seen.add(id);
      const date = item.isoDate ? new Date(item.isoDate) : null;
      if (stories.length < 100)
        stories.push({
          id,
          sourceUrl,
          sourceTitle: title,
          title: text(item.title) || "제목 없음",
          description: text(item.content || item.contentSnippet),
          url: url.href,
          publishedAt:
            date && Number.isFinite(date.getTime()) ? date.toISOString() : null,
        });
    }
    return {
      source: {
        url: sourceUrl,
        title,
        lastFetchedAt: new Date().toISOString(),
        excludedCount,
      },
      stories,
    };
  } catch {
    throw new FeedError(
      "INVALID_FEED",
      "올바른 RSS 또는 Atom 피드가 아닙니다.",
    );
  }
}
