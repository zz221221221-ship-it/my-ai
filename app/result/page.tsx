"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ResultReport from "@/components/ResultReport";
import { buildResultReport, loadSession } from "@/lib/gameEngine";
import type { GameSession, ResultReport as Report } from "@/lib/types";

export default function ResultPage() {
  const router = useRouter();
  const [session, setSession] = useState<GameSession | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    const loaded = loadSession();
    if (!loaded) {
      router.push("/");
      return;
    }
    setSession(loaded);
    setReport(buildResultReport(loaded));
  }, [router]);

  if (!session || !report) {
    return <main className="flex min-h-screen items-center justify-center bg-ink text-slate-200">결과를 정리하는 중...</main>;
  }

  return (
    <main className="min-h-screen bg-ink px-4 py-8 text-white">
      <ResultReport session={session} report={report} onRestart={() => router.push("/")} />
    </main>
  );
}
