"use client";

import { useState, type ReactNode } from "react";
import { GAME_MODES } from "@/lib/gameEngine";
import type { EvidenceClue, GameMasterUpdate, GameSession, PlayerState } from "@/lib/types";

function AccordionItem({ title, badge, children }: { title: string; badge?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-[8px] border border-line bg-black/20">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <span className="font-black">{title}</span>
        <span className="flex items-center gap-2 text-xs text-slate-400">
          {badge && <b className="rounded-full bg-rose-500 px-2 py-0.5 text-white">{badge}</b>}
          {open ? "접기 ▲" : "펼치기 ▼"}
        </span>
      </button>
      {open && <div className="border-t border-line p-4 text-sm leading-6 text-slate-300">{children}</div>}
    </section>
  );
}

function findState(states: PlayerState[], playerId: string) {
  return states.find((state) => state.playerId === playerId) || { playerId, trust: 50, suspicion: 30, affection: 45 };
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

function ClueBox({ clue }: { clue: EvidenceClue }) {
  const reasoningPoints = clue.reasoningPoints || [];
  return (
    <div className="rounded-[8px] border border-clue/20 bg-clue/10 p-3">
      <p className="font-bold text-clue">{clue.name}</p>
      <p className="mt-2"><b>발견 장소:</b> {clue.foundAt || "미상"}</p>
      <p><b>외형:</b> {clue.appearance || "미상"}</p>
      <p><b>상태:</b> {clue.condition || "미상"}</p>
      <p><b>훼손 흔적:</b> {clue.damage || "미상"}</p>
      <p><b>내용:</b> {clue.content || "미상"}</p>
      <p><b>발견 턴:</b> {clue.discoveredTurn}턴</p>
      {reasoningPoints.length > 0 && (
        <div className="mt-2">
          <b>추리 포인트</b>
          <ul className="mt-1 list-disc pl-5">
            {reasoningPoints.map((point, index) => (
              <li key={`${clue.id}-reason-${index}`}>{point}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function InvestigationPanel({
  session,
  lastMasterUpdate,
  viewerPlayerId
}: {
  session: GameSession;
  lastMasterUpdate: GameMasterUpdate | null;
  viewerPlayerId?: string;
}) {
  const mode = GAME_MODES[session.mode];
  const newClue = Boolean(lastMasterUpdate?.newEvidence);
  const human = session.players.find((player) => player.id === viewerPlayerId) || session.players.find((player) => player.kind === "human");
  const myRole = session.playerRoles.find((role) => role.playerId === human?.id);

  return (
    <aside className="h-screen overflow-y-auto border-l border-line bg-panel/95 p-4">
      <header className="mb-4 rounded-[8px] border border-kakao/30 bg-kakao/10 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">조사 노트</p>
        <h2 className="mt-2 text-xl font-black">{mode.label} · Turn {session.currentTurn}/{session.maxTurns}</h2>
      </header>

      <div className="space-y-3">
        <AccordionItem title="사건 메모">
          {(session.caseBriefing.memoLines || []).map((line, index) => (
            <p key={`memo-${index}`}>• {line}</p>
          ))}
        </AccordionItem>

        <AccordionItem title="현재 상황">
          <p>{session.situation}</p>
          <div className="mt-3 rounded-[8px] bg-white/[0.04] p-3">
            <p><b>현재 시간:</b> {session.worldState.currentTime}</p>
            <p><b>남은 예상 시간:</b> {session.worldState.remainingTime}</p>
            <p><b>위험도:</b> {session.worldState.dangerLevel}</p>
            <p><b>주요 장소:</b> {session.worldState.mainLocation}</p>
            {(session.worldState.metrics || []).map((metric, index) => (
              <p key={`metric-${index}-${metric.label}`}><b>{metric.label}:</b> {metric.value}</p>
            ))}
          </div>
        </AccordionItem>

        <AccordionItem title="내 역할">
          {myRole ? (
            <div className="space-y-3">
              <div className="rounded-[8px] border border-kakao/30 bg-kakao/10 p-3">
                <p className="text-xs font-bold text-kakao">역할</p>
                <p className="mt-1 text-lg font-black text-white">{myRole.roleName}</p>
              </div>
              <div>
                <p className="font-bold text-kakao">승리 목표</p>
                <p>{myRole.victoryGoal}</p>
              </div>
              <div>
                <p className="font-bold text-rose-200">패배 조건</p>
                <p>{myRole.defeatCondition}</p>
              </div>
              <div>
                <p className="font-bold text-sky-200">현재 관계</p>
                <p>{myRole.relationship}</p>
              </div>
              <div>
                <p className="font-bold text-slate-200">행동 가능 범위</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(myRole.actionScope || []).map((scope, index) => (
                    <span key={`scope-${index}-${scope}`} className="rounded-full bg-white/[0.06] px-2 py-1 text-xs">{scope}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p>역할 정보를 불러오는 중입니다.</p>
          )}
        </AccordionItem>

        <AccordionItem title="내 목표">
          <p>{session.turnGoal}</p>
        </AccordionItem>

        <AccordionItem title="내 비밀">
          <p className="rounded-[8px] border border-rose-300/30 bg-rose-400/10 p-3 text-rose-50">{myRole?.secret || session.mySecret}</p>
        </AccordionItem>

        <AccordionItem title="단서함" badge={newClue ? "NEW" : undefined}>
          <div className="space-y-3">
            {session.discoveredClues.length > 0 ? (
              session.discoveredClues.map((clue, index) => <ClueBox key={clue.id || `clue-${index}`} clue={clue} />)
            ) : (
              <p className="text-slate-500">아직 확보한 단서가 없습니다.</p>
            )}
          </div>
        </AccordionItem>

        <AccordionItem title="사건 기록">
          <div className="space-y-3">
            {session.timeline.length > 0 ? session.timeline.map((event, index) => (
              <div key={`timeline-${event.turn}-${index}`} className="rounded-[8px] bg-white/[0.04] p-3">
                <p className="font-bold text-kakao">{event.turn}턴 · {event.title}</p>
                <p className="mt-1 text-xs leading-5">{event.detail}</p>
              </div>
            )) : <p className="text-slate-500">아직 기록된 사건이 없습니다.</p>}
          </div>
        </AccordionItem>

        <AccordionItem title="플레이어 목록">
          <div className="space-y-3">
            {session.players.map((player, index) => {
              const state = findState(session.playerStates, player.id);
              const role = session.playerRoles.find((item) => item.playerId === player.id);
              const suspicious = state.suspicion >= 60;
              return (
                <div key={player.id || `player-${index}`} className={`rounded-[8px] border p-3 ${suspicious ? "border-rose-400/40 bg-rose-500/10" : "border-white/5 bg-white/[0.04]"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-7 w-7 rounded-full" style={{ backgroundColor: player.color }} />
                      <div>
                        <b>{player.name}</b>
                        {role && <p className="text-[11px] text-slate-500">{role.roleName}</p>}
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">{player.kind === "ai" ? "AI" : "HUMAN"}</span>
                  </div>
                  <div className="mt-3 space-y-2 text-[11px] text-slate-400">
                    <div className="grid grid-cols-[42px_1fr_24px] items-center gap-2"><span>신뢰</span><MiniBar value={state.trust} color="bg-emerald-400" /><span>{state.trust}</span></div>
                    <div className="grid grid-cols-[42px_1fr_24px] items-center gap-2"><span>의심</span><MiniBar value={state.suspicion} color="bg-rose-400" /><span>{state.suspicion}</span></div>
                    <div className="grid grid-cols-[42px_1fr_24px] items-center gap-2"><span>호감</span><MiniBar value={state.affection} color="bg-sky-400" /><span>{state.affection}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </AccordionItem>
      </div>
    </aside>
  );
}
