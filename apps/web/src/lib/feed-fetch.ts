import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";

export class FeedError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const error = (code: string) =>
  new FeedError(
    code,
    (
      {
        INVALID_URL: "안전한 공개 HTTP(S) 주소를 입력해 주세요.",
        NETWORK_ERROR: "피드에 연결하지 못했습니다.",
        HTTP_ERROR: "피드 서버가 요청을 처리하지 못했습니다.",
        TIMEOUT: "피드 요청 시간이 초과되었습니다.",
        TOO_LARGE: "피드 크기가 너무 큽니다.",
        TOO_MANY_REDIRECTS: "피드의 이동 횟수가 너무 많습니다.",
      } as Record<string, string>
    )[code] ?? "피드를 가져오지 못했습니다.",
  );

function isPublic(address: string): boolean {
  if (!ipaddr.isValid(address)) return false;
  const parsed = ipaddr.parse(address);
  if (
    parsed instanceof ipaddr.IPv6 &&
    parsed.match(ipaddr.IPv6.parse("::"), 96)
  )
    return false;
  return ipaddr.process(address).range() === "unicast";
}

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
      (isIP(host) && !isPublic(host))
    )
      throw 0;
    url.hash = "";
    if (url.href.length > 2048) throw 0;
    return url.href;
  } catch {
    throw error("INVALID_URL");
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
              resolve({ status, body: Buffer.concat(chunks) }),
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
      return { xml: response.body.toString("utf8"), url };
    }
  } catch (cause) {
    if (controller.signal.aborted) throw error("TIMEOUT");
    if (cause instanceof FeedError) throw cause;
    throw error("NETWORK_ERROR");
  } finally {
    clearTimeout(timer);
  }
}
