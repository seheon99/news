"use client";
/* eslint-disable tailwindcss/no-custom-classname */
import { useReaderStore } from "@/stores/reader-provider";

export default function Saved() {
  const data = useReaderStore((s) => s.data);
  const entries = Object.entries(data.saved).sort((a, b) =>
    b[1].localeCompare(a[1]),
  );
  return (
    <section className="saved-list" aria-label="저장한 소식">
      {entries.length ? (
        entries.map(([id, date]) => {
          const story = data.stories[id];
          if (!story) return null;
          return (
            <a
              key={id}
              href={story.url}
              target="_blank"
              rel="noopener noreferrer"
              className="saved-card"
            >
              <h2>{story.title}</h2>
              <p className="saved-source">{story.sourceTitle}</p>
              <p className="saved-date">
                {new Date(date).toLocaleDateString("ko-KR")} 저장 · 원문 읽기 ↗
              </p>
            </a>
          );
        })
      ) : (
        <p className="saved-empty">아직 저장한 소식이 없어요.</p>
      )}
    </section>
  );
}
