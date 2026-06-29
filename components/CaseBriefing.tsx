"use client";

import { GAME_MODES } from "@/lib/gameEngine";
import type { GameSession } from "@/lib/types";

export default function CaseBriefing({ session, onEnter }: { session: GameSession; onEnter: () => void }) {
  const mode = GAME_MODES[session.mode];
  const briefing = session.caseBriefing;
  const human = session.players.find((player) => player.kind === "human");
  const myRole = session.playerRoles.find((role) => role.playerId === human?.id);

  return (
    <main className="min-h-screen bg-ink px-5 py-8 text-white">
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-[8px] border border-kakao/30 bg-kakao/10 p-7 shadow-glow">
          <p className="text-sm font-black text-kakao">{mode.label} 모드 사건 브리핑</p>
          <h1 className="mt-3 text-4xl font-black">{briefing.title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">{briefing.background}</p>
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          <article className="rounded-[8px] border border-line bg-panel p-5">
            <h2 className="font-black text-clue">현재 장소</h2>
            <p className="mt-3 text-sm leading-6 text-slate-200">{briefing.location}</p>
          </article>
          <article className="rounded-[8px] border border-line bg-panel p-5">
            <h2 className="font-black text-clue">주요 사건</h2>
            <p className="mt-3 text-sm leading-6 text-slate-200">{briefing.mainIncident}</p>
          </article>
          <article className="rounded-[8px] border border-kakao/30 bg-kakao/10 p-5">
            <h2 className="font-black text-kakao">현재 목표</h2>
            <p className="mt-3 text-sm leading-6 text-slate-100">{briefing.goal}</p>
          </article>
          <article className="rounded-[8px] border border-rose-300/30 bg-rose-400/10 p-5">
            <h2 className="font-black text-rose-100">첫 번째 의문</h2>
            <p className="mt-3 text-sm leading-6 text-slate-100">{briefing.firstQuestion}</p>
          </article>
        </div>

        {myRole && (
          <article className="rounded-[8px] border border-sky-300/30 bg-sky-400/10 p-5">
            <h2 className="font-black text-sky-100">내 역할</h2>
            <div className="mt-3 grid gap-3 text-sm leading-6 text-slate-100 md:grid-cols-2">
              <p><b>👤 역할:</b> {myRole.roleName}</p>
              <p><b>🎯 승리 목표:</b> {myRole.victoryGoal}</p>
              <p><b>❌ 패배 조건:</b> {myRole.defeatCondition}</p>
              <p><b>🤝 현재 관계:</b> {myRole.relationship}</p>
              <p className="md:col-span-2"><b>🔒 비밀:</b> {myRole.secret}</p>
            </div>
          </article>
        )}

        <article className="rounded-[8px] border border-line bg-panel p-5">
          <h2 className="font-black">기본 규칙</h2>
          <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-3">
            {briefing.rules.map((rule) => (
              <p key={rule} className="rounded-[8px] bg-white/[0.04] p-3">• {rule}</p>
            ))}
          </div>
        </article>

        <div className="flex justify-center">
          <button onClick={onEnter} className="rounded-[8px] bg-kakao px-7 py-4 text-base font-black text-black transition hover:scale-[1.02]">
            채팅방 입장하기
          </button>
        </div>
      </section>
    </main>
  );
}
