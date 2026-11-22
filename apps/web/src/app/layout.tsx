import type { Metadata } from "next";
import "./reader.css";
import { AppLayout } from "@/components/app-layout";
import { ReaderProvider } from "@/stores/reader-provider";
export const metadata: Metadata = {
  title: "줍줍",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>
        <ReaderProvider>
          <AppLayout>{children}</AppLayout>
        </ReaderProvider>
      </body>
    </html>
  );
}
