"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useReaderStore } from "@/stores/reader-provider";
import { Alert } from "@/components/ui/alert";
export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const saved = useReaderStore((s) => Object.keys(s.data.saved).length);
  const error = useReaderStore((s) => s.storageError);
  return (
    <>
      <header className="border-b border-[#e8eaf0] bg-white">
        <nav
          aria-label="주 메뉴"
          className="mx-auto flex max-w-170 items-center gap-5 px-5 py-3 sm:gap-6 sm:px-6 sm:py-4"
        >
          <Link
            href="/"
            className="mr-auto text-[28px] font-extrabold tracking-tight text-[#f14c71]"
          >
            모아.
          </Link>
          {[
            ["/", "탐색"],
            ["/saved", "저장"],
            ["/settings", "구독 설정"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={path === href ? "page" : undefined}
              className={`text-sm font-semibold whitespace-nowrap ${path === href ? "text-[#ef4e75]" : "text-[#8a93a1]"}`}
            >
              {label}
              {href === "/saved" && (
                <span className="ml-1 rounded-xl bg-[#fff0f4] px-1.5 text-[11px]">
                  {saved}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-145 px-3.5 pt-3.5 sm:px-6 sm:pt-[22px]">
        {error && <Alert className="mb-4">{error}</Alert>}
        {children}
      </main>
    </>
  );
}
