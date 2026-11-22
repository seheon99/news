import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import { error, FeedError, isPublic, normalizeFeedUrl } from "./feed-url.ts";

function decodeFeed(body: Buffer, contentType?: string): string {
  const bytes = body.subarray(0, 512);
  const bom =
    body[0] === 0xef && body[1] === 0xbb && body[2] === 0xbf
      ? "utf-8"
      : body[0] === 0xff && body[1] === 0xfe
        ? "utf-16le"
        : body[0] === 0xfe && body[1] === 0xff
          ? "utf-16be"
          : bytes[0] === 0x3c &&
              bytes[1] === 0 &&
              bytes[2] === 0x3f &&
              bytes[3] === 0
            ? "utf-16le"
            : bytes[0] === 0 &&
                bytes[1] === 0x3c &&
                bytes[2] === 0 &&
                bytes[3] === 0x3f
              ? "utf-16be"
              : undefined;
  const httpCharset = contentType?.match(
    /\bcharset\s*=\s*["']?([^\s;"']+)/i,
  )?.[1];
  const declarationPrefix = new TextDecoder(bom ?? "utf-8").decode(bytes);
  const xmlCharset = declarationPrefix.match(
    /^\s*<\?xml\b[^>]*\bencoding\s*=\s*["']([^"']+)["']/i,
  )?.[1];
  const encoding = bom ?? httpCharset ?? xmlCharset ?? "utf-8";
  try {
    return new TextDecoder(encoding, { fatal: true }).decode(body);
  } catch {
    throw error("UNSUPPORTED_ENCODING");
  }
}

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
                () => reject(error("TIMEOUT")),
                { once: true },
              ),
            ),
          ]);
      if (
        !addresses.length ||
        addresses.some(({ address }) => !isPublic(address))
      )
        throw error("INVALID_URL");
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
              reject(error("HTTP_ERROR"));
              return;
            }
            let size = 0;
            const chunks: Buffer[] = [];
            res.on("data", (chunk: Buffer) => {
              size += chunk.length;
              if (size > 2 * 1024 * 1024) {
                res.destroy();
                reject(error("TOO_LARGE"));
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
        if (redirects >= 3) throw error("TOO_MANY_REDIRECTS");
        if (!response.location) throw error("HTTP_ERROR");
        try {
          url = normalizeFeedUrl(new URL(response.location, url).href);
        } catch {
          throw error("INVALID_URL");
        }
        continue;
      }
      return { xml: decodeFeed(response.body, response.contentType), url };
    }
  } catch (cause) {
    if (controller.signal.aborted) throw error("TIMEOUT");
    if (cause instanceof FeedError) throw cause;
    throw error("NETWORK_ERROR");
  } finally {
    clearTimeout(timer);
  }
}
