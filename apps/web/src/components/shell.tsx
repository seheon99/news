"use client";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { Button } from "@/components/catalyst/button";
import { Heading } from "@/components/catalyst/heading";
import { Link } from "@/components/catalyst/link";
import { Text } from "@/components/catalyst/text";
import { libraryGroups } from "@/lib/reader";
import { useReaderStore } from "@/stores/reader-provider";

const tabs = [
  ["/", "피드"],
  ["/library", "보관함"],
  ["/subscriptions", "구독"],
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const activeTab = tabs.findIndex(([href]) => href === path);
  const data = useReaderStore((s) => s.data);
  const error = useReaderStore((s) => s.storageError);
  const [title, count] =
    path === "/library"
      ? (() => {
          const { bookmarked, stored } = libraryGroups(data);
          return ["보관함", bookmarked.length + stored.length];
        })()
      : path === "/subscriptions"
        ? ["구독", data.sources.length]
        : ["받은 항목", data.queue.length];

  return (
    <div className="mx-auto flex h-dvh w-full max-w-105 flex-col pb-[env(safe-area-inset-bottom)]">
      <header className="flex-none px-6 pt-5 pb-2 max-[420px]:px-5 max-[420px]:pt-3">
        <div className="flex w-full items-center justify-between">
          <Heading className="text-[28px]/[1.45]! font-bold! tracking-[-0.04em] text-foreground!">
            {title}{" "}
            <span className="pl-1 align-[2px] text-xl font-medium text-foreground/60">
              {count}
            </span>
          </Heading>
          {path !== "/subscriptions" && (
            <Button
              href="/subscriptions"
              outline
              aria-label="구독 설정"
              className="size-10 items-center! rounded-full! bg-white p-0! [--btn-icon:var(--color-foreground)]! *:data-[slot=icon]:size-6!"
            >
              <Cog6ToothIcon />
            </Button>
          )}
        </div>
      </header>
      <main
        className={`flex min-h-0 w-full flex-1 flex-col ${path === "/" ? "" : "overflow-y-auto"} px-6 pt-2 pb-4 max-[420px]:px-5 max-[420px]:pb-3`}
      >
        {error && (
          <Text
            role="alert"
            className="mb-4 rounded-xl border border-red-700/30 bg-red-700/5 px-4 py-3 text-red-700!"
          >
            {error}
          </Text>
        )}
        {children}
      </main>
      <nav
        aria-label="주 메뉴"
        style={{ "--active-index": activeTab } as CSSProperties}
        className="relative mx-auto mt-2 mb-3 flex w-[min(240px,calc(100%-40px))] flex-none gap-1 self-center rounded-full border border-black/10 bg-card p-1"
      >
        {activeTab >= 0 && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1 left-1 h-10 w-[calc((100%-16px)/3)] translate-x-[calc(var(--active-index)*(100%+4px))] rounded-full bg-accent transition-transform duration-200 motion-reduce:transition-none"
          />
        )}
        {tabs.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            aria-current={path === href ? "page" : undefined}
            className="relative z-10 flex min-h-10 min-w-0 flex-1 items-center justify-center rounded-full text-sm font-medium whitespace-nowrap text-muted aria-[current=page]:font-bold aria-[current=page]:text-foreground"
          >
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
