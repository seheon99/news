"use client";
import { ArchiveBoxIcon, TrashIcon } from "@heroicons/react/24/outline";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { gestureAction, SWIPE_TRIGGER } from "@/lib/gesture";
import { vibrate } from "@/lib/haptic";
import type { Story } from "@/lib/reader/types";
import { useReaderStore } from "@/stores/use-reader-store";
import { SwipeHint } from "./swipe-hint";

const DRAG_START = 10;

type Gesture = NonNullable<ReturnType<typeof gestureAction>>;

export function SwipeCard({
  story,
  onChoose,
}: {
  story: Story;
  onChoose: (action: Gesture, id: string) => void;
}) {
  const isCurrent = useReaderStore((s) => s.isCurrent);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{
    x: number;
    y: number;
    moved: boolean;
    id: string;
  } | null>(null);
  const suppress = useRef(false);
  const armed = gestureAction(offset.x, offset.y);
  const horizontal = Math.abs(offset.x) > Math.abs(offset.y);
  useEffect(() => {
    if (armed === "skip" || armed === "store") vibrate();
  }, [armed]);
  const reveal = horizontal
    ? Math.min(Math.abs(offset.x) / SWIPE_TRIGGER, 1)
    : 0;
  const settling = !offset.x && !offset.y;
  function down(e: PointerEvent<HTMLElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, moved: false, id: story.id };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent<HTMLElement>) {
    if (!drag.current) return;
    const x = e.clientX - drag.current.x,
      y = e.clientY - drag.current.y;
    if (Math.hypot(x, y) > DRAG_START) {
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
      if (action) onChoose(action, start.id);
    }
  }
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <SwipeHint
        icon={<TrashIcon />}
        label="버리기"
        className="justify-end bg-red-500"
        opacity={offset.x < 0 ? reveal : 0}
        armed={armed === "skip"}
        settling={settling}
      />
      <SwipeHint
        icon={<ArchiveBoxIcon />}
        label="챙기기"
        className="justify-start bg-indigo-600"
        opacity={offset.x > 0 ? reveal : 0}
        armed={armed === "store"}
        settling={settling}
      />
      <article
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={(e) => end(e)}
        onPointerCancel={(e) => end(e, true)}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) rotate(${offset.x / 20}deg)`,
        }}
        className={`relative z-10 flex flex-1 cursor-grab touch-none flex-col overflow-hidden rounded-[20px] border border-line bg-card select-none ${
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
          <h1 className="mt-3 mb-4 flex-none text-lg/[1.45] font-bold wrap-anywhere">
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
          <p className="text-md/[1.45] min-h-0 flex-1 overflow-hidden mask-b-from-70% font-medium wrap-anywhere text-secondary">
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
    </div>
  );
}
