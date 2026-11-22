import { CheckIcon } from "@heroicons/react/24/outline";
import { Heading } from "@/components/catalyst/heading";
import { Text, TextLink } from "@/components/catalyst/text";

export function EmptyState({
  hydrated,
  sources,
  stories,
  loading,
  failed,
}: {
  hydrated: boolean;
  sources: number;
  stories: number;
  loading: boolean;
  failed: number;
}) {
  const done = hydrated && sources && !loading && failed !== sources && stories;
  const empty = !hydrated
    ? "저장된 소식을 불러오는 중이에요."
    : !sources
      ? "구독 설정에서 첫 피드를 등록해 주세요."
      : loading
        ? "새 소식을 불러오는 중이에요."
        : failed === sources
          ? "출처를 불러오지 못했어요. 구독 설정에서 다시 시도해 주세요."
          : stories
            ? "모든 소식을 살펴봤어요."
            : "아직 받아온 소식이 없어요.";
  return (
    <div className="py-14 text-center text-muted">
      {done ? <CheckIcon className="mx-auto mb-5 block size-24" /> : null}
      <Heading className="text-xl! font-bold text-foreground!">{empty}</Heading>
      {!sources && hydrated && (
        <Text className="mt-4">
          <TextLink href="/subscriptions">구독 설정으로 이동</TextLink>
        </Text>
      )}
    </div>
  );
}
