"use client";
/* eslint-disable tailwindcss/no-custom-classname, @next/next/no-img-element */
import { useEffect, useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import { ArrowUpIcon, HeartIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";
import { gestureAction } from "@/lib/gesture";
import { useReaderStore } from "@/stores/reader-provider";
import { useFeedMutate, useFeedStatus } from "@/hooks/feed-sync";

type Action = "skip" | "save" | "defer";
export function StoryCard() {
  const data = useReaderStore((s) => s.data);
  const hydrated = useReaderStore((s) => s.hydrated);
  const choose = useReaderStore((s) => s.choose);
  const isCurrent = useReaderStore((s) => s.isCurrent);
  const undo = useReaderStore((s) => s.undo);
  const interest = useReaderStore((s) => s.interest);
  const history = useReaderStore((s) => s.history);
  const statuses = useFeedStatus();
  const mutate = useFeedMutate();
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
        e.target.closest("input, textarea, button, a, select, [data-no-drag]")
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
      } else if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
        setMessage("직전 선택을 되돌렸어요.");
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [choose, undo, story]);
  function down(e: PointerEvent<HTMLElement>) {
    if (
      (e.target as HTMLElement).closest("[data-no-drag]") ||
      (e.pointerType === "mouse" && e.button !== 0)
    )
      return;
    if (!story) return;
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
    <div className="relative mx-auto max-w-[470px] overflow-x-clip">
      {story ? (
        <>
          {offset.x < -24 && (
            <div className="story-swipe-hint is-skip" aria-hidden="true">
              <img
                src="/figma/discard-panel.svg"
                alt=""
                width="36"
                height="36"
              />
              <span>안 읽기</span>
            </div>
          )}
          {offset.x > 24 && (
            <div className="story-swipe-hint is-save" aria-hidden="true">
              <img src="/figma/save-panel.svg" alt="" width="36" height="36" />
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
            className="story-card"
            onClick={() => {
              if (!suppress.current)
                window.open(story.url, "_blank", "noopener,noreferrer");
            }}
          >
            <div className="story-card-content">
              <h1 data-no-drag tabIndex={0} className="story-title">
                {story.title}
              </h1>
              <p
                data-no-drag
                tabIndex={0}
                onClick={(e) => e.stopPropagation()}
                className="story-description"
              >
                {story.description}
              </p>
              <div className="story-meta">
                <span className="story-source">{story.sourceTitle}</span>
                <time>
                  {story.publishedAt
                    ? new Date(story.publishedAt).toLocaleDateString("ko-KR")
                    : "날짜 정보 없음"}
                </time>
                <a
                  data-no-drag
                  href={story.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  원문 보기 ↗
                </a>
              </div>
            </div>
          </article>
        </>
      ) : (
        <div className="story-empty">
          {hydrated &&
            data.sources.length > 0 &&
            !loading &&
            failed !== data.sources.length &&
            Object.keys(data.stories).length > 0 && (
              <img src="/figma/complete.svg" width="96" height="96" alt="" />
            )}
          <h1>{empty}</h1>
          {!data.sources.length && hydrated && (
            <Link href="/settings" className="mt-4 inline-block underline">
              구독 설정으로 이동
            </Link>
          )}
        </div>
      )}
      <div aria-label="카드 선택" className="story-actions">
        {[
          {
            label: "직전 선택 되돌리기",
            icon: <img src="/figma/undo.svg" width="24" height="24" alt="" />,
            disabled: !history.length,
            shortLabel: "되돌리기",
            run: () => {
              undo();
              setMessage("직전 선택을 되돌렸어요.");
            },
          },
          {
            label: "안 읽기",
            icon: (
              <img src="/figma/discard.svg" width="24" height="24" alt="" />
            ),
            disabled: !story,
            shortLabel: "안읽기",
            run: () => act("skip"),
          },
          {
            label: "큐 맨 뒤로 보류",
            icon: <ArrowUpIcon />,
            disabled: !story,
            shortLabel: "보류",
            run: () => act("defer"),
          },
          {
            label: liked ? "관심 표시 취소" : "관심 표시",
            icon: liked ? <HeartSolid /> : <HeartIcon />,
            disabled: !story,
            shortLabel: "관심",
            pressed: liked,
            run: () => {
              interest();
              setMessage(
                liked ? "관심 표시를 취소했어요." : "관심을 표시했어요.",
              );
            },
          },
          {
            label: "저장하고 다음 카드",
            icon: (
              <img src="/figma/bookmark.svg" width="24" height="24" alt="" />
            ),
            disabled: !story,
            shortLabel: "저장",
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
            variant="outline"
            className="story-action-button"
          >
            {a.icon}
            <span>{a.shortLabel}</span>
          </Button>
        ))}
      </div>
      <p role="status" className="story-message">
        {message || (loading ? "새 소식을 확인하고 있어요." : "")}
        <span className="sr-only"> 선택 {announcement}</span>
      </p>
      <div className="story-feed-status">
        {failed > 0 && (
          <Link href="/settings">출처 {failed}개를 불러오지 못했어요</Link>
        )}{" "}
        {data.sources.length > 0 && (
          <button
            className="ml-2 underline"
            onClick={() => {
              data.sources.forEach((s) => void mutate(s.url));
              setMessage("새 소식을 확인하고 있어요.");
            }}
          >
            <img src="/figma/refresh.svg" width="16" height="16" alt="" /> 전체
            새로고침
          </button>
        )}
      </div>
    </div>
  );
}
