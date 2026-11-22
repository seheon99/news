import { downloadFeed } from "@/lib/feed-fetch.ts";
import { FeedError, normalizeFeedUrl } from "@/lib/feed-url.ts";
import { parseFeed } from "@/lib/feed.ts";

export const runtime = "nodejs";
let activeFetches = 0;

export async function POST(request: Request): Promise<Response> {
  try {
    const reader = request.body?.getReader();
    if (!reader)
      throw new FeedError("INVALID_URL", "피드 주소를 입력해 주세요.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 4096) {
        await reader.cancel();
        throw new FeedError("INVALID_URL", "피드 주소가 너무 깁니다.");
      }
      chunks.push(value);
    }
    let input: unknown;
    try {
      input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new FeedError("INVALID_URL", "피드 주소를 입력해 주세요.");
    }
    if (
      !input ||
      typeof input !== "object" ||
      !("url" in input) ||
      typeof input.url !== "string"
    )
      throw new FeedError("INVALID_URL", "피드 주소를 입력해 주세요.");
    const sourceUrl = normalizeFeedUrl(input.url);
    if (activeFetches >= 8)
      throw new FeedError(
        "BUSY",
        "요청이 많습니다. 잠시 후 다시 시도해 주세요.",
      );
    activeFetches++;
    try {
      const result = await downloadFeed(sourceUrl);
      return Response.json(await parseFeed(result.xml, sourceUrl, result.url), {
        headers: { "Cache-Control": "no-store" },
      });
    } finally {
      activeFetches--;
    }
  } catch (cause) {
    const failure =
      cause instanceof FeedError
        ? cause
        : new FeedError("NETWORK_ERROR", "피드를 가져오지 못했습니다.");
    const status =
      failure.code === "BUSY"
        ? 429
        : failure.code === "INVALID_URL"
          ? 400
          : failure.code === "TIMEOUT"
            ? 504
            : 502;
    return Response.json(
      { code: failure.code, message: failure.message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
