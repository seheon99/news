import type { Story } from "../types";

export function publishedTime(story: Story): number {
  return story.publishedAt === null ? -Infinity : Date.parse(story.publishedAt);
}
