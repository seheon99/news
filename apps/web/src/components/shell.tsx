"use client";
/* eslint-disable tailwindcss/no-custom-classname, @next/next/no-img-element */
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useReaderStore } from "@/stores/reader-provider";
import { Alert } from "@/components/ui/alert";

const tabs = [
  ["/", "피드"],
  ["/saved", "보관함"],
  ["/settings", "구독"],
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const activeTab = tabs.findIndex(([href]) => href === path);
  const data = useReaderStore((s) => s.data);
  const error = useReaderStore((s) => s.storageError);
  const [title, count] =
    path === "/saved"
      ? ["보관함", Object.keys(data.saved).length]
      : path === "/settings"
        ? ["구독", data.sources.length]
        : ["받은 항목", data.queue.length];

  return (
    <div className="reader-shell">
      <header className="reader-header">
        <div className="reader-header-inner">
          <h1 className="reader-heading">
            {title} <span>{count}</span>
          </h1>
          {path !== "/settings" && (
            <Link
              href="/settings"
              className="reader-settings"
              aria-label="구독 설정"
            >
              <img src="/figma/settings.svg" alt="" width="24" height="24" />
            </Link>
          )}
        </div>
      </header>
      <main className="reader-main">
        {error && <Alert className="mb-4">{error}</Alert>}
        {children}
      </main>
      <nav
        className="reader-tabs"
        aria-label="주 메뉴"
        data-active-index={activeTab >= 0 ? activeTab : undefined}
      >
        {tabs.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            aria-current={path === href ? "page" : undefined}
            className={path === href ? "reader-tab is-active" : "reader-tab"}
          >
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
