"use client";
import {
  ArchiveBoxIcon,
  BookmarkIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Text } from "@/components/catalyst/text";
import { LibrarySection } from "@/components/library-section";
import { libraryGroups } from "@/lib/reader/library-groups";
import { useReaderStore } from "@/stores/use-reader-store";

export default function Library() {
  const data = useReaderStore((s) => s.data);
  const hydrated = useReaderStore((s) => s.hydrated);
  if (!hydrated) return null;
  const { bookmarked, stored, dropped } = libraryGroups(data);
  if (!bookmarked.length && !stored.length && !dropped.length)
    return (
      <Text className="px-3 py-12 text-center text-muted!">
        아직 보관한 소식이 없어요.
      </Text>
    );
  return (
    <div className="flex flex-col gap-4 pb-2">
      <LibrarySection title="북마크" Icon={BookmarkIcon} entries={bookmarked} />
      <LibrarySection
        title="챙긴 소식"
        Icon={ArchiveBoxIcon}
        entries={stored}
      />
      <LibrarySection
        title="안 읽은 소식"
        Icon={TrashIcon}
        entries={dropped}
        compact
      />
    </div>
  );
}
