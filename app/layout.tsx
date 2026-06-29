import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "AI 분신 소셜 추리 MVP",
  description: "AI 분신들과 함께 플레이하는 턴제 소셜 추리 게임 프로토타입"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
