import assert from "node:assert/strict";
import { test } from "vitest";
import { parseFeed } from "./parse-feed";

const source = "https://example.com/feed";
const rss = (items: string) =>
  `<rss version="2.0"><channel><title>News</title>${items}</channel></rss>`;

test("normalizes RSS, strips hostile HTML, resolves links and deduplicates", async () => {
  const result = await parseFeed(
    rss(
      `<item><guid>a</guid><title><![CDATA[Hello <b>world</b>]]></title><link>/story</link><description><![CDATA[<p>Hi &amp; bye</p><script>secret()</script>]]></description><pubDate>Wed, 01 Jan 2025 00:00:00 GMT</pubDate></item><item><guid>a</guid><title>Duplicate</title><link>/story</link></item><item><guid>x</guid><title>Unsafe</title><link>javascript:alert(1)</link></item><item><guid>y</guid><title>No link</title></item>`,
    ),
    source,
  );
  assert.equal(result.source.title, "News");
  assert.equal(result.source.excludedCount, 2);
  assert.equal(result.stories.length, 1);
  assert.equal(result.stories[0].title, "Hello world");
  assert.equal(result.stories[0].description, "Hi & bye");
  assert.equal(result.stories[0].url, "https://example.com/story");
  assert.equal(result.stories[0].publishedAt, "2025-01-01T00:00:00.000Z");
});

test("parses Atom with missing dates and resolves against the final URL", async () => {
  const result = await parseFeed(
    `<feed xmlns="http://www.w3.org/2005/Atom"><title>Atom</title><entry><id>id</id><title>Story</title><link href="entry"/><summary>Text</summary></entry></feed>`,
    source,
    "https://cdn.example.org/path/feed",
  );
  assert.equal(result.source.url, source);
  assert.equal(result.stories[0].url, "https://cdn.example.org/path/entry");
  assert.equal(result.stories[0].publishedAt, null);
});

test("rejects malformed XML, HTML and entity declarations", async () => {
  for (const xml of [
    "<rss><channel>",
    "<html><body>Not a feed</body></html>",
    "<!DOCTYPE rss [<!ENTITY x SYSTEM 'file:///etc/passwd'>]><rss>&x;</rss>",
  ]) {
    await assert.rejects(parseFeed(xml, source), { code: "INVALID_FEED" });
  }
});

test("limits results to 100 stories", async () => {
  const items = Array.from(
    { length: 105 },
    (_, i) =>
      `<item><title>Story ${i}</title><link>https://example.com/${i}</link></item>`,
  ).join("");
  const result = await parseFeed(rss(items), source);
  assert.equal(result.stories.length, 100);
});
