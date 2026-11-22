"use client";
import {
  ArchiveBoxIcon,
  BookmarkIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType, SVGProps } from "react";
import { Subheading } from "@/components/catalyst/heading";
import { Text } from "@/components/catalyst/text";
import { type LibraryEntry, libraryGroups } from "@/lib/reader";
import { useReaderStore } from "@/stores/reader-provider";

const date = (at: string | null) =>
  at ? new Date(at).toLocaleDateString("ko-KR") : null;

function Section({
  title,
  Icon,
  entries,
  compact = false,
}: {
  title: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  entries: LibraryEntry[];
  compact?: boolean;
}) {
  if (!entries.length) return null;
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <Subheading className="flex items-center gap-1.5 px-1 pt-3 text-[13px]! font-bold! text-secondary!">
        <Icon className="size-4" aria-hidden="true" />
        {title} <span className="font-medium text-muted">{entries.length}</span>
      </Subheading>
      {compact ? (
        <ul className="divide-y divide-line rounded-[20px] border border-line">
          {entries.map(({ story }) => (
            <li key={story.id}>
              <a
                href={story.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 items-baseline gap-3 px-4 py-2.5 text-sm text-muted"
              >
                <span className="min-w-0 flex-1 truncate">{story.title}</span>
                <span className="flex-none truncate text-xs">
                  {story.sourceTitle}
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        entries.map(({ story, at }) => (
          <a
            key={story.id}
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
                {date(at)}
              </time>
            </div>
          </a>
        ))
      )}
    </section>
  );
}

export default function Library() {
  const data = useReaderStore((s) => s.data);
  const hydrated = useReaderStore((s) => s.hydrated);
  if (!hydrated) return null;
  const { bookmarked, stored, dropped } = libraryGroups(data);
  if (!bookmarked.length && !stored.length && !dropped.length)
    return (
      <Text className="px-3 py-12 text-center text-muted!">
        아직 보관한 소식이 없어요.
      </Text>
    );
  return (
    <div className="flex flex-col gap-4 pb-2">
      <Section title="북마크" Icon={BookmarkIcon} entries={bookmarked} />
      <Section title="챙긴 소식" Icon={ArchiveBoxIcon} entries={stored} />
      <Section
        title="안 읽은 소식"
        Icon={TrashIcon}
        entries={dropped}
        compact
      />
    </div>
  );
}
