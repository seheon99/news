import type { Metadata } from "next";
import "./reader.css";
import { AppLayout } from "@/components/app-layout";
import { FeedSync } from "@/components/feed-sync";
export const metadata: Metadata = {
  title: "줍줍",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>
        <FeedSync>
          <AppLayout>{children}</AppLayout>
        </FeedSync>
      </body>
    </html>
  );
}
