"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  ArchiveBoxIcon,
  ArrowUpIcon,
  ArrowUturnLeftIcon,
  BookmarkIcon,
  CheckIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { ArchiveBoxIcon as ArchiveBoxSolid } from "@heroicons/react/24/solid";
import { Button } from "@/components/catalyst/button";
import { Heading } from "@/components/catalyst/heading";
import { Text, TextLink } from "@/components/catalyst/text";
import { gestureAction } from "@/lib/gesture";
import { useReaderStore } from "@/stores/reader-provider";
import { useFeedStatus } from "@/hooks/feed-sync";

type Action = "skip" | "save" | "defer";
export function StoryCard() {
  const data = useReaderStore((s) => s.data);
  const hydrated = useReaderStore((s) => s.hydrated);
  const choose = useReaderStore((s) => s.choose);
  const isCurrent = useReaderStore((s) => s.isCurrent);
  const undo = useReaderStore((s) => s.undo);
  const interest = useReaderStore((s) => s.interest);
  const history = useReaderStore((s) => s.history);
  const canUndo = history.length > 0;
  const statuses = useFeedStatus();
  const [message, setMessage] = useState("");
  const [announcement, setAnnouncement] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{
    x: number;
    y: number;
    moved: boolean;
    id: string;
  } | null>(null);
  const suppress = useRef(false);
  const story = data.stories[data.queue[0]];
  const liked = !!story && Object.hasOwn(data.interests, story.id);
  const loading = data.sources.some(
    (s) => !statuses[s.url] || statuses[s.url].loading,
  );
  const failed = data.sources.filter((s) => statuses[s.url]?.error).length;
  function announce(action: Action, title: string) {
    setAnnouncement((id) => id + 1);
    setMessage(
      `${
        {
          skip: "안 읽기로 선택했어요.",
          save: "저장했어요.",
          defer: "맨 뒤로 보류했어요.",
        }[action]
      } ${title}`,
    );
  }
  function act(action: Action, expectedId?: string) {
    if (!choose(action, expectedId)) return;
    announce(action, data.stories[expectedId ?? data.queue[0]]?.title ?? "");
  }
  useEffect(() => {
    function key(e: KeyboardEvent) {
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
        { ArrowLeft: "skip", ArrowRight: "save", ArrowUp: "defer" } as const
      )[e.key as "ArrowLeft"];
      if (action && story) {
        e.preventDefault();
        choose(action);
        announce(action, story.title);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "z" && canUndo) {
        e.preventDefault();
        undo();
        setMessage("직전 선택을 되돌렸어요.");
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [choose, undo, story, canUndo]);
  function down(e: PointerEvent<HTMLElement>) {
    if ((e.pointerType === "mouse" && e.button !== 0) || !story) return;
    drag.current = { x: e.clientX, y: e.clientY, moved: false, id: story.id };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent<HTMLElement>) {
    if (!drag.current) return;
    const x = e.clientX - drag.current.x,
      y = e.clientY - drag.current.y;
    if (Math.hypot(x, y) > 10) {
      drag.current.moved = true;
      setOffset({ x, y });
    }
  }
  function end(e: PointerEvent<HTMLElement>, cancel = false) {
    const start = drag.current;
    if (!start) return;
    drag.current = null;
    setOffset({ x: 0, y: 0 });
    if (start.moved || cancel || !isCurrent(start.id)) {
      suppress.current = true;
      setTimeout(() => {
        suppress.current = false;
      }, 100);
    }
    if (!cancel) {
      const action = gestureAction(e.clientX - start.x, e.clientY - start.y);
      if (action) act(action, start.id);
    }
  }
  const empty = !hydrated
    ? "저장된 소식을 불러오는 중이에요."
    : !data.sources.length
      ? "구독 설정에서 첫 피드를 등록해 주세요."
      : loading
        ? "새 소식을 불러오는 중이에요."
        : failed === data.sources.length
          ? "출처를 불러오지 못했어요. 구독 설정에서 다시 시도해 주세요."
          : Object.keys(data.stories).length
            ? "모든 소식을 살펴봤어요."
            : "아직 받아온 소식이 없어요.";
  return (
    <div className="relative mx-auto flex min-h-0 w-full max-w-[470px] flex-1 flex-col overflow-x-clip">
      {story ? (
        <>
          {offset.x < -24 && (
            <div
              className="pointer-events-none absolute top-0 bottom-[62px] -left-6 z-20 flex w-29 flex-col items-end gap-2 rounded-l-3xl bg-skip px-3 py-7 text-white [&>span]:text-lg [&>span]:font-bold [&>svg]:size-9"
              aria-hidden="true"
            >
              <TrashIcon />
              <span>안 읽기</span>
            </div>
          )}
          {offset.x > 24 && (
            <div
              className="pointer-events-none absolute top-0 -right-6 bottom-[62px] z-20 flex w-29 flex-col items-start gap-2 rounded-r-3xl bg-save px-3 py-7 text-white [&>span]:text-lg [&>span]:font-bold [&>svg]:size-9"
              aria-hidden="true"
            >
              <ArchiveBoxIcon />
              <span>저장</span>
            </div>
          )}
          <article
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={(e) => end(e)}
            onPointerCancel={(e) => end(e, true)}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) rotate(${offset.x / 20}deg)`,
            }}
            className={`relative z-10 flex max-h-[650px] min-h-0 flex-1 cursor-grab touch-none flex-col overflow-hidden rounded-[20px] border border-line bg-card select-none ${
              // Follow the finger 1:1 while dragging; only animate the snap-back.
              offset.x || offset.y
                ? ""
                : "transition-transform duration-180 motion-reduce:transition-none"
            }`}
            onClick={() => {
              if (!suppress.current)
                window.open(story.url, "_blank", "noopener,noreferrer");
            }}
          >
            <div className="flex min-h-0 flex-1 flex-col p-6">
              <h1 className="mt-3 mb-4 line-clamp-4 flex-none text-[27px]/[1.45] font-bold wrap-anywhere">
                <a
                  href={story.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  draggable={false}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (suppress.current) e.preventDefault();
                  }}
                >
                  {story.title}
                </a>
              </h1>
              {/* ponytail: card shows a fading preview; the full text is one tap away in the original article. */}
              <p className="min-h-0 flex-1 overflow-hidden mask-b-from-70% text-xl/[1.45] font-medium wrap-anywhere text-secondary">
                {story.description}
              </p>
              <div className="mt-auto flex flex-none items-baseline justify-between gap-3 pt-4 text-xs text-muted">
                <span className="min-w-0 flex-1 truncate font-semibold text-secondary">
                  {story.sourceTitle}
                </span>
                <time className="flex-none whitespace-nowrap">
                  {story.publishedAt
                    ? new Date(story.publishedAt).toLocaleDateString("ko-KR")
                    : "날짜 정보 없음"}
                </time>
              </div>
            </div>
          </article>
        </>
      ) : (
        <div className="py-14 text-center text-muted">
          {hydrated &&
            data.sources.length > 0 &&
            !loading &&
            failed !== data.sources.length &&
            Object.keys(data.stories).length > 0 && (
              <CheckIcon className="mx-auto mb-5 block size-24" />
            )}
          <Heading className="text-xl! font-bold text-foreground!">
            {empty}
          </Heading>
          {!data.sources.length && hydrated && (
            <Text className="mt-4">
              <TextLink href="/subscriptions">구독 설정으로 이동</TextLink>
            </Text>
          )}
        </div>
      )}
      {story && (
        <div
          aria-label="카드 선택"
          className="grid grid-cols-[44px_minmax(0,1fr)_44px_minmax(0,1fr)_44px] gap-[5px] pt-3.5"
        >
          {[
            {
              label: "직전 선택 되돌리기",
              icon: <ArrowUturnLeftIcon />,
              disabled: !history.length,
              visibleLabel: undefined,
              run: () => {
                undo();
                setMessage("직전 선택을 되돌렸어요.");
              },
            },
            {
              label: "안 읽기",
              icon: <TrashIcon />,
              disabled: !story,
              visibleLabel: "안 읽기",
              run: () => act("skip"),
            },
            {
              label: "큐 맨 뒤로 보류",
              icon: <ArrowUpIcon />,
              disabled: !story,
              visibleLabel: undefined,
              run: () => act("defer"),
            },
            {
              label: liked ? "챙기기 취소" : "챙기기",
              icon: liked ? <ArchiveBoxSolid /> : <ArchiveBoxIcon />,
              disabled: !story,
              visibleLabel: "챙기기",
              pressed: liked,
              run: () => {
                interest();
                setMessage(liked ? "챙기기를 취소했어요." : "챙겼어요.");
              },
            },
            {
              label: "저장하고 다음 카드",
              icon: <BookmarkIcon />,
              disabled: !story,
              visibleLabel: undefined,
              run: () => act("save"),
            },
          ].map((a) => (
            <Button
              key={a.label}
              aria-label={a.label}
              title={a.label}
              aria-pressed={a.pressed}
              disabled={a.disabled}
              onClick={a.run}
              outline
              className={`min-h-12 w-full min-w-11 items-center! gap-0.5! rounded-2xl! border-line! bg-card p-[3px]! text-secondary! [--btn-icon:currentColor]! aria-pressed:bg-secondary! aria-pressed:text-white! ${a.visibleLabel ? "gap-1.5! *:data-[slot=icon]:size-5!" : "*:data-[slot=icon]:size-6!"}`}
            >
              {a.icon}
              {a.visibleLabel && (
                <span className="text-sm font-semibold whitespace-nowrap">
                  {a.visibleLabel}
                </span>
              )}
            </Button>
          ))}
        </div>
      )}
      {/* Screen-reader-only: announces each choice without a visible status line. */}
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
