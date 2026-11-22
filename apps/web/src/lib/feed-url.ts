import ipaddr from "ipaddr.js";

export class FeedError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export const error = (code: string) =>
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
        UNSUPPORTED_ENCODING: "지원하지 않는 피드 문자 인코딩입니다.",
      } as Record<string, string>
    )[code] ?? "피드를 가져오지 못했습니다.",
  );

export function isPublic(address: string): boolean {
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
      (ipaddr.isValid(host) && !isPublic(host))
    )
      throw 0;
    url.hash = "";
    if (url.href.length > 2048) throw 0;
    return url.href;
  } catch {
    throw error("INVALID_URL");
  }
}
