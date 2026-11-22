"use client";
import {
  ArchiveBoxIcon,
  ArrowUpIcon,
  ArrowUturnLeftIcon,
  BookmarkIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/catalyst/button";
import type { Choice } from "@/lib/reader";

const actionButton =
  "min-h-12 w-full min-w-11 items-center! gap-0.5! rounded-2xl! border-line! bg-card p-[3px]! text-secondary! [--btn-icon:currentColor]!";

export function StoryActions({
  hasStory,
  canUndo,
  onChoose,
  onUndo,
}: {
  hasStory: boolean;
  canUndo: boolean;
  onChoose: (action: Choice) => void;
  onUndo: () => void;
}) {
  if (!hasStory)
    return (
      canUndo && (
        <div className="flex justify-center pt-3.5">
          <Button
            outline
            onClick={onUndo}
            className={`${actionButton} w-auto! gap-1.5! px-5! *:data-[slot=icon]:size-5!`}
          >
            <ArrowUturnLeftIcon />
            <span className="text-sm font-semibold">직전 선택 되돌리기</span>
          </Button>
        </div>
      )
    );
  return (
    <fieldset
      aria-label="카드 선택"
      className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)_44px_minmax(0,1fr)_44px] gap-[5px] pt-3.5"
    >
      {[
        {
          label: "직전 선택 되돌리기",
          icon: <ArrowUturnLeftIcon />,
          disabled: !canUndo,
          run: onUndo,
        },
        {
          label: "안 읽기",
          icon: <TrashIcon />,
          visibleLabel: "안 읽기",
          run: () => onChoose("skip"),
        },
        {
          label: "큐 맨 뒤로 보류",
          icon: <ArrowUpIcon />,
          run: () => onChoose("defer"),
        },
        {
          label: "챙기기",
          icon: <ArchiveBoxIcon />,
          visibleLabel: "챙기기",
          run: () => onChoose("store"),
        },
        {
          label: "북마크",
          icon: <BookmarkIcon />,
          primary: true,
          run: () => onChoose("save"),
        },
      ].map((a) => (
        <Button
          key={a.label}
          aria-label={a.label}
          title={a.label}
          disabled={a.disabled}
          onClick={a.run}
          outline
          className={`${actionButton} ${a.visibleLabel ? "gap-1.5! *:data-[slot=icon]:size-5!" : "*:data-[slot=icon]:size-6!"} ${a.primary ? "border-secondary! bg-secondary! text-white!" : ""}`}
        >
          {a.icon}
          {a.visibleLabel && (
            <span className="text-sm font-semibold whitespace-nowrap">
              {a.visibleLabel}
            </span>
          )}
        </Button>
      ))}
    </fieldset>
  );
}
