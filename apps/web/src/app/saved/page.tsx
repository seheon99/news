"use client";
import { useReaderStore } from "@/stores/reader-provider";
export default function Saved() {
  const data = useReaderStore((s) => s.data);
  const entries = Object.entries(data.saved).sort((a, b) =>
    b[1].localeCompare(a[1]),
  );
  return (
    <section className="py-4">
      <h1 className="text-2xl font-bold">저장한 소식</h1>
      {entries.length ? (
        entries.map(([id, date]) => {
          const story = data.stories[id];
          return (
            <a
              key={id}
              href={story.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block border-b border-[#dfe4ed] py-6"
            >
              <span className="text-xs font-bold text-[#778091]">
                {story.sourceTitle}
              </span>
              <h2 className="my-2 text-xl font-bold">{story.title}</h2>
              <p className="text-xs text-[#8b94a2]">
                {new Date(date).toLocaleDateString("ko-KR")} 저장 · 원문 읽기 ↗
              </p>
            </a>
          );
        })
      ) : (
        <p className="py-20 text-center text-[#768092]">
          아직 저장한 소식이 없어요.
        </p>
      )}
    </section>
  );
}
