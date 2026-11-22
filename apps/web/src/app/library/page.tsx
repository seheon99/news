"use client";
import { Subheading } from "@/components/catalyst/heading";
import { Text } from "@/components/catalyst/text";
import { useReaderStore } from "@/stores/reader-provider";

export default function Library() {
  const data = useReaderStore((s) => s.data);
  const hydrated = useReaderStore((s) => s.hydrated);
  if (!hydrated) return null;
  const entries = Object.entries(data.saved).sort((a, b) =>
    b[1].localeCompare(a[1]),
  );
  return (
    <section className="flex flex-col gap-3" aria-label="저장한 소식">
      {entries.length ? (
        entries.map(([id, date]) => {
          const story = data.stories[id];
          if (!story) return null;
          return (
            <a
              key={id}
              href={story.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block min-w-0 rounded-[20px] border border-line bg-card p-[18px]"
            >
              <Subheading className="mb-2 text-[19px]/[1.45]! font-bold! wrap-anywhere text-foreground!">
                {story.title}
              </Subheading>
              <div className="flex min-w-0 items-baseline justify-between gap-3 text-xs/normal">
                <span className="min-w-0 flex-1 truncate text-secondary">
                  {story.sourceTitle}
                </span>
                <time className="flex-none whitespace-nowrap text-muted">
                  {new Date(date).toLocaleDateString("ko-KR")}
                </time>
              </div>
            </a>
          );
        })
      ) : (
        <Text className="px-3 py-12 text-center text-muted!">
          아직 저장한 소식이 없어요.
        </Text>
      )}
    </section>
  );
}
