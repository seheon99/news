export type Source = {
  url: string;
  title: string;
  lastFetchedAt: string | null;
  excludedCount: number;
};

export type Story = {
  id: string;
  sourceUrl: string;
  sourceTitle: string;
  title: string;
  description: string;
  url: string;
  publishedAt: string | null;
};

export type FeedResult = { source: Source; stories: Story[] };

export type ReaderState = {
  version: 1;
  sources: Source[];
  stories: Record<string, Story>;
  queue: string[];
  saved: Record<string, string>;
  skipped: string[];
  interests: Record<string, string>;
};

export type Choice = "skip" | "store" | "save" | "defer";

export type LibraryEntry = { story: Story; at: string | null };
