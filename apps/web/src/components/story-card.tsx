"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import {
  ArrowPathIcon,
  ArrowUpIcon,
  BookmarkIcon,
  HeartIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
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
        e.target.closest("input, textarea, button, a, select")
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
    <div className="mx-auto max-w-[470px]">
      {story ? (
        <article
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={(e) => end(e)}
          onPointerCancel={(e) => end(e, true)}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) rotate(${offset.x / 20}deg)`,
          }}
          className="flex h-[calc(100dvh-216px)] max-h-[650px] min-h-[410px] cursor-grab touch-none flex-col overflow-hidden rounded-[14px] border border-[#e5e7ef] bg-white shadow-[0_7px_26px_#26314212] transition-transform motion-reduce:transition-none sm:h-[calc(100dvh-238px)] sm:min-h-[490px] sm:rounded-[18px]"
          onClick={() => {
            if (!suppress.current)
              window.open(story.url, "_blank", "noopener,noreferrer");
          }}
        >
          <div className="bg-linear-to-r from-[#fff1f5] to-[#f0edff] px-6 py-5 text-xl font-extrabold tracking-widest text-[#b53a67] sm:px-7 sm:py-[26px]">
            {story.sourceTitle}
          </div>
          <div className="flex min-h-0 flex-1 flex-col p-6 sm:p-7">
            <span className="text-xs font-bold tracking-wider text-[#778091]">
              {story.sourceTitle}
            </span>
            <h1 className="my-4 text-[27px] leading-tight font-bold tracking-tight wrap-break-word sm:text-[29px]">
              {story.title}
            </h1>
            <p
              data-no-drag
              onClick={(e) => e.stopPropagation()}
              className="min-h-0 touch-pan-y overflow-auto text-sm leading-7 text-[#667184] sm:text-[15px]"
            >
              {story.description}
            </p>
            <div className="mt-auto flex flex-col gap-1.5 pt-4 text-[11px] text-[#969eaa]">
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
                className="text-[13px] font-semibold text-[#f04f77]"
              >
                원문 보기 ↗
              </a>
            </div>
          </div>
        </article>
      ) : (
        <div className="py-20 text-center text-[#768092]">
          <h1 className="text-xl font-bold text-[#263142]">{empty}</h1>
          {!data.sources.length && hydrated && (
            <Link
              href="/settings"
              className="mt-4 inline-block text-[#ef4e75] underline"
            >
              구독 설정으로 이동
            </Link>
          )}
        </div>
      )}
      <div
        aria-label="카드 선택"
        className="flex items-center justify-between gap-2 px-2.5 pt-[17px] sm:gap-3 sm:px-2 sm:pt-[22px]"
      >
        {[
          {
            label: "직전 선택 되돌리기",
            icon: <ArrowPathIcon />,
            disabled: !history.length,
            color: "text-amber-400",
            run: () => {
              undo();
              setMessage("직전 선택을 되돌렸어요.");
            },
          },
          {
            label: "안 읽기",
            icon: <XMarkIcon />,
            disabled: !story,
            color: "text-rose-500",
            run: () => act("skip"),
          },
          {
            label: "큐 맨 뒤로 보류",
            icon: <ArrowUpIcon />,
            disabled: !story,
            color: "text-sky-500",
            run: () => act("defer"),
          },
          {
            label: liked ? "관심 표시 취소" : "관심 표시",
            icon: liked ? <HeartSolid /> : <HeartIcon />,
            disabled: !story,
            color: liked ? "bg-emerald-500 text-white" : "text-emerald-500",
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
            icon: <BookmarkIcon />,
            disabled: !story,
            color: "text-violet-500",
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
            className={`size-12 min-w-0 shrink-0 rounded-full p-2 shadow-sm sm:size-[58px] sm:p-3 [&_svg]:size-6 ${a.color}`}
          >
            {a.icon}
          </Button>
        ))}
      </div>
      <p
        role="status"
        className="mt-3 min-h-8 text-center text-xs text-[#7e8796]"
      >
        {message || (loading ? "새 소식을 확인하고 있어요." : "")}
        <span className="sr-only"> 선택 {announcement}</span>
      </p>
      <div className="text-center text-xs text-[#7e8796]">
        {failed > 0 && (
          <Link className="text-rose-600 underline" href="/settings">
            출처 {failed}개를 불러오지 못했어요
          </Link>
        )}{" "}
        {data.sources.length > 0 && (
          <button
            className="ml-2 underline"
            onClick={() => {
              data.sources.forEach((s) => void mutate(s.url));
              setMessage("새 소식을 확인하고 있어요.");
            }}
          >
            전체 새로고침
          </button>
        )}
      </div>
    </div>
  );
}
