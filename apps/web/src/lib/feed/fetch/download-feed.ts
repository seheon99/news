import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import { createFeedError } from "../errors/create-feed-error";
import { FeedError } from "../errors/feed-error";
import { decodeFeed } from "../parse/decode-feed";
import { isPublic } from "../url/is-public";
import { normalizeFeedUrl } from "../url/normalize-feed-url";

export async function downloadFeed(
  input: string,
): Promise<{ xml: string; url: string }> {
  let url = normalizeFeedUrl(input);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    for (let redirects = 0; ; redirects++) {
      const parsed = new URL(url);
      const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
      const addresses = isIP(hostname)
        ? [{ address: hostname, family: isIP(hostname) }]
        : await Promise.race([
            dns.lookup(hostname, { all: true, verbatim: true }),
            new Promise<never>((_, reject) =>
              controller.signal.addEventListener(
                "abort",
                () => reject(createFeedError("TIMEOUT")),
                { once: true },
              ),
            ),
          ]);
      if (
        !addresses.length ||
        addresses.some(({ address }) => !isPublic(address))
      )
        throw createFeedError("INVALID_URL");
      const address = addresses[0];
      const response = await new Promise<{
        status: number;
        location?: string;
        contentType?: string;
        body: Buffer;
      }>((resolve, reject) => {
        const request = (
          parsed.protocol === "https:" ? https.request : http.request
        )(
          parsed,
          {
            signal: controller.signal,
            family: address.family,
            lookup: (_host, _options, callback) =>
              callback(null, address.address, address.family),
            headers: {
              accept:
                "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
            },
          },
          (res) => {
            const status = res.statusCode ?? 0;
            if (status >= 300 && status < 400) {
              res.destroy();
              resolve({
                status,
                location: res.headers.location,
                body: Buffer.alloc(0),
              });
              return;
            }
            if (status < 200 || status >= 300) {
              res.destroy();
              reject(createFeedError("HTTP_ERROR"));
              return;
            }
            let size = 0;
            const chunks: Buffer[] = [];
            res.on("data", (chunk: Buffer) => {
              size += chunk.length;
              if (size > 2 * 1024 * 1024) {
                res.destroy();
                reject(createFeedError("TOO_LARGE"));
              } else chunks.push(chunk);
            });
            res.on("end", () =>
              resolve({
                status,
                contentType: res.headers["content-type"],
                body: Buffer.concat(chunks),
              }),
            );
            res.on("error", reject);
          },
        );
        request.on("error", reject);
        request.end();
      });
      if (response.status >= 300 && response.status < 400) {
        if (redirects >= 3) throw createFeedError("TOO_MANY_REDIRECTS");
        if (!response.location) throw createFeedError("HTTP_ERROR");
        try {
          url = normalizeFeedUrl(new URL(response.location, url).href);
        } catch {
          throw createFeedError("INVALID_URL");
        }
        continue;
      }
      return { xml: decodeFeed(response.body, response.contentType), url };
    }
  } catch (cause) {
    if (controller.signal.aborted) throw createFeedError("TIMEOUT");
    if (cause instanceof FeedError) throw cause;
    throw createFeedError("NETWORK_ERROR");
  } finally {
    clearTimeout(timer);
  }
}
