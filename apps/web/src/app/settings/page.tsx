"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchFeed, useFeedMutate, useFeedStatus } from "@/hooks/feed-sync";
import { useReaderStore } from "@/stores/reader-provider";
export default function Settings() {
  const data = useReaderStore((s) => s.data);
  const merge = useReaderStore((s) => s.merge);
  const statuses = useFeedStatus();
  const mutate = useFeedMutate();
  const [url, setUrl] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  async function register(event: FormEvent) {
    event.preventDefault();
    let normalized: string;
    try {
      const parsed = new URL(url.trim());
      if (
        !["http:", "https:"].includes(parsed.protocol) ||
        parsed.username ||
        parsed.password ||
        parsed.port
      )
        throw Error();
      parsed.hash = "";
      normalized = parsed.href;
    } catch {
      setFeedback("올바른 HTTP 또는 HTTPS 피드 주소를 입력해 주세요.");
      return;
    }
    if (data.sources.some((s) => s.url === normalized)) {
      setFeedback("이미 등록한 피드예요.");
      return;
    }
    setBusy(true);
    setFeedback("피드를 확인하고 있어요.");
    try {
      const result = await fetchFeed(normalized);
      merge(result);
      await mutate(normalized, result, { revalidate: false });
      setUrl("");
      setFeedback("구독을 등록했어요.");
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "피드를 가져오지 못했어요.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="py-4">
      <p className="text-xs tracking-widest text-[#f04f77]">구독 관리</p>
      <h1 className="mt-1 text-2xl font-bold">구독 설정</h1>
      <p className="mt-1 text-[#8b94a2]">새 소식을 받아볼 출처를 등록하세요.</p>
      <form onSubmit={register}>
        <label htmlFor="feed-url" className="mt-5 mb-2 block">
          RSS / Atom 피드 URL
        </label>
        <div className="flex gap-2">
          <Input
            id="feed-url"
            type="url"
            required
            placeholder="https://example.com/feed.xml"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button disabled={busy} type="submit">
            구독 등록
          </Button>
        </div>
        <p role="status" className="min-h-10 py-2 text-sm text-[#768092]">
          {feedback}
        </p>
      </form>
      <h2 className="text-lg font-bold">등록한 출처</h2>
      {data.sources.length === 0 && (
        <p className="py-5 text-sm text-[#8b94a2]">등록한 출처가 없어요.</p>
      )}
      {data.sources.map((source) => {
        const status = statuses[source.url];
        return (
          <div key={source.url} className="border-b border-[#e1e5ed] py-4">
            <strong>{source.title}</strong>
            <p className="text-xs break-all text-[#8b94a2]">{source.url}</p>
            <p
              className={`mt-1 text-sm ${status?.error ? "text-rose-600" : "text-[#768092]"}`}
            >
              {status?.loading || !status
                ? "확인 중…"
                : status.error
                  ? `실패: ${status.error} 기존 소식은 보관되어 있어요.`
                  : "수집 성공"}
            </p>
            <p className="text-xs text-[#8b94a2]">
              마지막 성공:{" "}
              {source.lastFetchedAt
                ? new Date(source.lastFetchedAt).toLocaleString("ko-KR")
                : "없음"}
              {source.excludedCount > 0 &&
                ` · 제외된 항목 ${source.excludedCount}개`}
            </p>
            <Button
              variant="outline"
              className="mt-2"
              disabled={status?.loading}
              onClick={() => void mutate(source.url)}
            >
              다시 시도
            </Button>
          </div>
        );
      })}
      <p className="mt-6 text-xs text-[#8b94a2]">
        구독과 선택 기록은 현재 브라우저에 보관됩니다.
      </p>
    </section>
  );
}
