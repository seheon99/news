"use client";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { SourceSync } from "@/components/source-sync";
import { useReaderStore } from "@/stores/use-reader-store";

export function FeedSync({ children }: { children?: ReactNode }) {
  const sources = useReaderStore((s) => s.data.sources);
  return (
    <SWRConfig value={{ provider: () => new Map() }}>
      {sources.map((s) => (
        <SourceSync key={s.url} url={s.url} />
      ))}
      {children}
    </SWRConfig>
  );
}
