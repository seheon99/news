"use client";
import { useEffect, useEffectEvent, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Text, TextLink } from "@/components/catalyst/text";
import type { Choice } from "@/lib/reader/types";
import { useReaderStore } from "@/stores/use-reader-store";
import { EmptyState } from "./empty-state";
import { StoryActions } from "./story-actions";
import { SwipeCard } from "./swipe-card";

export function StoryCard() {
  const { data, hydrated, choose, undo, history, loading, failed } =
    useReaderStore(
      useShallow((s) => ({
        data: s.data,
        hydrated: s.hydrated,
        choose: s.choose,
        undo: s.undo,
        history: s.history,
        loading: s.data.sources.some(
          (source) => s.statuses[source.url]?.loading ?? true,
        ),
        failed: s.data.sources.filter((source) => s.statuses[source.url]?.error)
          .length,
      })),
    );
  const canUndo = history.length > 0;
  const [message, setMessage] = useState("");
  const [announcement, setAnnouncement] = useState(0);
  const story = data.stories[data.queue[0]];
  function announce(action: Choice, title: string) {
    setAnnouncement((id) => id + 1);
    setMessage(
      `${
        {
          skip: "버렸어요.",
          store: "챙겼어요.",
          save: "북마크했어요.",
          defer: "맨 뒤로 보류했어요.",
        }[action]
      } ${title}`,
    );
  }
  function act(action: Choice, expectedId?: string) {
    if (!choose(action, expectedId)) return;
    announce(action, data.stories[expectedId ?? data.queue[0]]?.title ?? "");
  }
  function undoLast() {
    undo();
    setMessage("직전 선택을 되돌렸어요.");
  }
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (
      e.target instanceof HTMLElement &&
      e.target.closest("input, textarea, select, [contenteditable]")
    )
      return;
    if (
      e.altKey ||
      e.shiftKey ||
      (e.ctrlKey && e.key !== "z") ||
      (e.metaKey && e.key !== "z")
    )
      return;
    const action = (
      { ArrowLeft: "skip", ArrowRight: "store", ArrowUp: "defer" } as const
    )[e.key as "ArrowLeft"];
    if (action && story) {
      e.preventDefault();
      act(action);
    } else if ((e.ctrlKey || e.metaKey) && e.key === "z" && canUndo) {
      e.preventDefault();
      undoLast();
    }
  });
  useEffect(() => {
    const key = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col">
      {story ? (
        <SwipeCard story={story} onChoose={act} />
      ) : (
        <EmptyState
          hydrated={hydrated}
          sources={data.sources.length}
          stories={Object.keys(data.stories).length}
          loading={loading}
          failed={failed}
        />
      )}
      <StoryActions
        hasStory={!!story}
        canUndo={canUndo}
        onChoose={act}
        onUndo={undoLast}
      />
      <p role="status" className="sr-only">
        {message || (loading ? "새 소식을 확인하고 있어요." : "")}
        <span> 선택 {announcement}</span>
      </p>
      {failed > 0 && (
        <Text className="min-h-5 text-center text-xs! text-muted!">
          <TextLink href="/subscriptions" className="text-secondary!">
            출처 {failed}개를 불러오지 못했어요
          </TextLink>
        </Text>
      )}
    </div>
  );
}
