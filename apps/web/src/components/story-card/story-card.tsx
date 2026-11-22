"use client";
import { CheckIcon } from "@heroicons/react/24/outline";
import { useEffect, useEffectEvent, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Heading } from "@/components/catalyst/heading";
import { Text, TextLink } from "@/components/catalyst/text";
import { useFeedStatus } from "@/hooks/feed-sync";
import type { Choice } from "@/lib/reader";
import { useReaderStore } from "@/stores/reader-provider";
import { StoryActions } from "./story-actions";
import { SwipeCard } from "./swipe-card";

export function StoryCard() {
  const { data, hydrated, choose, undo, history } = useReaderStore(
    useShallow((s) => ({
      data: s.data,
      hydrated: s.hydrated,
      choose: s.choose,
      undo: s.undo,
      history: s.history,
    })),
  );
  const canUndo = history.length > 0;
  const statuses = useFeedStatus();
  const [message, setMessage] = useState("");
  const [announcement, setAnnouncement] = useState(0);
  const story = data.stories[data.queue[0]];
  const loading = data.sources.some(
    (s) => !statuses[s.url] || statuses[s.url].loading,
  );
  const failed = data.sources.filter((s) => statuses[s.url]?.error).length;
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
    <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-x-clip">
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

function EmptyState({
  hydrated,
  sources,
  stories,
  loading,
  failed,
}: {
  hydrated: boolean;
  sources: number;
  stories: number;
  loading: boolean;
  failed: number;
}) {
  const done = hydrated && sources && !loading && failed !== sources && stories;
  const empty = !hydrated
    ? "저장된 소식을 불러오는 중이에요."
    : !sources
      ? "구독 설정에서 첫 피드를 등록해 주세요."
      : loading
        ? "새 소식을 불러오는 중이에요."
        : failed === sources
          ? "출처를 불러오지 못했어요. 구독 설정에서 다시 시도해 주세요."
          : stories
            ? "모든 소식을 살펴봤어요."
            : "아직 받아온 소식이 없어요.";
  return (
    <div className="py-14 text-center text-muted">
      {done ? <CheckIcon className="mx-auto mb-5 block size-24" /> : null}
      <Heading className="text-xl! font-bold text-foreground!">{empty}</Heading>
      {!sources && hydrated && (
        <Text className="mt-4">
          <TextLink href="/subscriptions">구독 설정으로 이동</TextLink>
        </Text>
      )}
    </div>
  );
}
