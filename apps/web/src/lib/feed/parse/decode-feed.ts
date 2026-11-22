import { createFeedError } from "../errors/create-feed-error";

export function decodeFeed(body: Buffer, contentType?: string): string {
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
    throw createFeedError("UNSUPPORTED_ENCODING");
  }
}
