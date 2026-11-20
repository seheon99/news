import "./reader.css";
import { ReaderProvider } from "@/stores/reader-provider";
import { Shell } from "@/components/shell";
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
