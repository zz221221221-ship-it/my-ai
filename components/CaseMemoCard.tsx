"use client";

import type { CaseBriefing } from "@/lib/types";

export default function CaseMemoCard({ briefing }: { briefing: CaseBriefing }) {
  return (
    <article className="mx-auto max-w-2xl rounded-[8px] border border-clue/30 bg-clue/10 p-5 shadow-glow">
      <p className="font-black text-clue">📌 사건 메모</p>
      <div className="mt-3 space-y-1.5 text-sm leading-6 text-slate-100">
        {briefing.memoLines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </article>
  );
}
