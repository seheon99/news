"use client";
import { type FormEvent, useState } from "react";
import { Avatar } from "@/components/catalyst/avatar";
import { Button } from "@/components/catalyst/button";
import { Field, Label } from "@/components/catalyst/fieldset";
import { Subheading } from "@/components/catalyst/heading";
import { Input } from "@/components/catalyst/input";
import { Text } from "@/components/catalyst/text";
import { fetchFeed, useFeedMutate, useFeedStatus } from "@/hooks/feed-sync";
import { normalizeFeedUrl } from "@/lib/feed-url";
import { useReaderStore } from "@/stores/reader-provider";

export default function Subscriptions() {
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
    <section className="flex flex-col gap-3">
      <form onSubmit={register}>
        <Field>
          <Label className="block px-1 pt-3 text-[13px]! font-bold! text-secondary!">
            RSS 피드 추가
          </Label>
          <div className="mt-2 flex gap-2">
            <Input
              id="feed-url"
              type="url"
              required
              placeholder="RSS 또는 Atom 링크 붙여넣기"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="min-w-0 flex-1"
            />
            <Button
              disabled={busy}
              type="submit"
              className="flex-none [--btn-bg:var(--color-secondary)]! [--btn-border:var(--color-secondary)]!"
            >
              추가
            </Button>
          </div>
        </Field>
        <Text
          role="status"
          className="pt-2 text-[13px]! text-muted! empty:hidden"
        >
          {feedback}
        </Text>
      </form>
      <section className="flex flex-col gap-3">
        <Subheading className="flex items-baseline justify-between px-1 pt-3 text-[13px]! font-bold! text-secondary!">
          RSS <span>{data.sources.length}</span>
        </Subheading>
        {data.sources.length === 0 && (
          <Text className="px-3 py-12 text-center text-muted!">
            등록한 출처가 없어요.
          </Text>
        )}
        {data.sources.length > 0 && (
          <ul className="divide-y divide-line overflow-hidden rounded-[20px] border border-line bg-card">
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
                <li
                  key={source.url}
                  className="flex items-center gap-3 px-4 py-3.5"
                >
                  <Avatar
                    initials={source.title.trim().charAt(0)}
                    className="size-9 bg-avatar font-bold text-foreground"
                  />
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-base text-foreground">
                      {source.title}
                    </strong>
                    <p
                      className={`mt-1 text-xs/normal wrap-anywhere ${status?.error ? "text-danger" : "text-muted"}`}
                    >
                      {subtitle}
                    </p>
                  </div>
                  {status?.error && (
                    <Button
                      outline
                      disabled={status.loading}
                      onClick={() => void mutate(source.url)}
                      className="flex-none"
                    >
                      다시 시도
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </section>
  );
}
