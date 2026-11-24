import type { ComponentType, SVGProps } from "react";
import { Subheading } from "@/components/base/heading";
import { formatDate } from "@/lib/format-date";
import type { LibraryEntry } from "@/lib/reader/types";

export function LibrarySection({
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
      <Subheading className="flex items-center gap-1.5 px-1 pt-3 text-sm! font-bold! text-secondary!">
        <Icon className="size-4" aria-hidden="true" />
        {title} <span className="font-medium text-muted">{entries.length}</span>
      </Subheading>
      {compact ? (
        <ul className="divide-y divide-line rounded-3xl border border-line">
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
            className="block min-w-0 rounded-3xl border border-line bg-card p-[18px]"
          >
            <Subheading className="mb-2 text-lg/[1.45]! font-bold! wrap-anywhere text-foreground!">
              {story.title}
            </Subheading>
            <div className="flex min-w-0 items-baseline justify-between gap-3 text-xs/normal">
              <span className="min-w-0 flex-1 truncate text-secondary">
                {story.sourceTitle}
              </span>
              <time className="flex-none whitespace-nowrap text-muted">
                {formatDate(at)}
              </time>
            </div>
          </a>
        ))
      )}
    </section>
  );
}
