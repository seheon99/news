"use client";
/* eslint-disable tailwindcss/no-custom-classname */
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchFeed, useFeedMutate, useFeedStatus } from "@/hooks/feed-sync";
import { normalizeFeedUrl } from "@/lib/feed-url";
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
      normalized = normalizeFeedUrl(url.trim());
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
      // Seed the SWR cache first so the SourceSync mounted by this merge does not refetch.
      await mutate(normalized, result, { revalidate: false });
      merge(result);
      setUrl("");
      setFeedback("구독을 등록했어요.");
    } catch {
      setFeedback(
        "출처를 추가하지 못했어요. RSS 주소를 확인하고 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="settings-page">
      <form className="settings-feed-form" onSubmit={register}>
        <label htmlFor="feed-url" className="settings-title">
          RSS 피드 추가
        </label>
        <div className="settings-form-row">
          <Input
            id="feed-url"
            type="url"
            required
            placeholder="RSS 또는 Atom 링크 붙여넣기"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button disabled={busy} type="submit">
            추가
          </Button>
        </div>
        <p role="status" className="settings-feedback">
          {feedback}
        </p>
      </form>
      <section className="settings-sources">
        <h2 className="settings-title">
          RSS <span>{data.sources.length}</span>
        </h2>
        {data.sources.length === 0 && (
          <p className="settings-empty">등록한 출처가 없어요.</p>
        )}
        {data.sources.length > 0 && (
          <div className="source-list">
            {data.sources.map((source) => {
              const status = statuses[source.url];
              const host = (() => {
                try {
                  return new URL(source.url).hostname;
                } catch {
                  return source.url;
                }
              })();
              const subtitle = status?.error
                ? "새 소식을 가져오지 못했어요. 잠시 후 다시 시도해 주세요."
                : status?.loading || !status
                  ? `${host} · 새 소식을 확인하고 있어요.`
                  : `${host}${source.lastFetchedAt ? ` · ${new Date(source.lastFetchedAt).toLocaleDateString("ko-KR")} 업데이트` : " · 새 소식을 확인했어요."}`;
              return (
                <div key={source.url} className="source-row">
                  <span className="source-avatar" aria-hidden="true">
                    {source.title.trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="source-details">
                    <strong>{source.title}</strong>
                    <p
                      className={`source-status ${status?.error ? "has-error" : ""}`}
                    >
                      {subtitle}
                    </p>
                  </div>
                  {status?.error && (
                    <Button
                      variant="outline"
                      disabled={status.loading}
                      onClick={() => void mutate(source.url)}
                    >
                      다시 시도
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
