import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "AI 분신 소셜 게임",
  description: "나와 친구의 AI 분신이 함께하는 소셜 추리 게임"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
