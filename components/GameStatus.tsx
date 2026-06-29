"use client";

import { GAME_MODES } from "@/lib/gameEngine";
import type { GameMasterUpdate, GameSession, PlayerState } from "@/lib/types";

const MODE_ICONS = {
  deduction: "🕵",
  survival: "🧟",
  politics: "👑",
  romance: "❤️",
  drama: "🎭"
};

const DANGER_COLORS: Record<GameSession["worldState"]["dangerLevel"], string> = {
  안정: "text-emerald-300",
  주의: "text-kakao",
  위험: "text-orange-300",
  위기: "text-rose-300"
};

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

function findState(states: PlayerState[], playerId: string) {
  return states.find((state) => state.playerId === playerId) || { playerId, trust: 50, suspicion: 30, affection: 45 };
}

export default function GameStatus({ session, lastMasterUpdate }: { session: GameSession; lastMasterUpdate: GameMasterUpdate | null }) {
  const mode = GAME_MODES[session.mode];
  const progress = Math.round((session.currentTurn / session.maxTurns) * 100);

  return (
    <aside className="h-full overflow-y-auto border-r border-line bg-panel/95 p-4">
      <div className="space-y-4">
        <section className="rounded-[8px] border border-line bg-black/20 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">현재 모드</p>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-black">
            <span>{MODE_ICONS[session.mode]}</span>
            <span>{mode.label}</span>
          </h1>
        </section>

        <section className="rounded-[8px] border border-line bg-black/20 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-slate-200">현재 턴</p>
            <p className="text-sm text-slate-400">Turn {session.currentTurn} / {session.maxTurns}</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
            <div className={`h-full rounded-full bg-gradient-to-r ${mode.accent}`} style={{ width: `${progress}%` }} />
          </div>
        </section>

        <section className="rounded-[8px] border border-clue/30 bg-clue/10 p-4">
          <h2 className="font-black text-clue">현재 상황</h2>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-100">{session.situation}</p>
        </section>

        <section className="rounded-[8px] border border-line bg-black/20 p-4">
          <h2 className="font-black">현재 세계 상태</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-200">
            <p>현재 시간: {session.worldState.currentTime}</p>
            <p>남은 예상 시간: {session.worldState.remainingTime}</p>
            <p>위험도: <b className={DANGER_COLORS[session.worldState.dangerLevel]}>{session.worldState.dangerLevel}</b></p>
            <p>주요 장소: {session.worldState.mainLocation}</p>
            {session.worldState.metrics.map((metric) => (
              <p key={metric.label}>{metric.label}: {metric.value}</p>
            ))}
          </div>
        </section>

        <section className="rounded-[8px] border border-line bg-black/20 p-4">
          <h2 className="font-black">플레이어 목록</h2>
          <div className="mt-4 space-y-3">
            {session.players.map((player) => {
              const state = findState(session.playerStates, player.id);
              return (
                <div key={player.id} className="rounded-[8px] border border-white/5 bg-white/[0.04] p-3">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="h-8 w-8 rounded-full border border-white/10" style={{ backgroundColor: player.color }} />
                      <span className="text-sm font-bold">{player.name}</span>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${player.kind === "ai" ? "bg-cyan-300 text-black" : "bg-kakao text-black"}`}>{player.kind === "ai" ? "AI" : "HUMAN"}</span>
                  </div>
                  <div className="space-y-2 text-[11px] text-slate-400">
                    <div className="grid grid-cols-[42px_1fr_24px] items-center gap-2"><span>신뢰</span><Bar value={state.trust} color="bg-emerald-400" /><span>{state.trust}</span></div>
                    <div className="grid grid-cols-[42px_1fr_24px] items-center gap-2"><span>의심</span><Bar value={state.suspicion} color="bg-rose-400" /><span>{state.suspicion}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {lastMasterUpdate && (
          <section className="rounded-[8px] border border-line bg-black/20 p-4">
            <h2 className="font-black">최근 GM 진행</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">{lastMasterUpdate.noticeBody}</p>
          </section>
        )}
      </div>
    </aside>
  );
}
