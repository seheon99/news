import type { Metadata } from "next";
import "./reader.css";
import { Shell } from "@/components/shell";
import { ReaderProvider } from "@/stores/reader-provider";
export const metadata: Metadata = {
  title: "줍줍",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>
        <ReaderProvider>
          <Shell>{children}</Shell>
        </ReaderProvider>
      </body>
    </html>
  );
}
