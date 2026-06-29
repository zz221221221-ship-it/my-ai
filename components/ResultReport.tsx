"use client";

import { GAME_MODES } from "@/lib/gameEngine";
import type { GameSession, ResultReport as Report } from "@/lib/types";

function getEndingType(session: GameSession, report: Report) {
  if (report.endingJudgement.outcomeTitle) return report.endingJudgement.outcomeTitle;
  if (session.discoveredClues.length >= 4) return "진실 근접 엔딩";
  if (session.discoveredClues.length >= 2) return "미완성 증거 엔딩";
  return "혼란의 단톡방 엔딩";
}

export default function ResultReport({ session, report, onRestart }: { session: GameSession; report: Report; onRestart: () => void }) {
  const finalClue = session.discoveredClues.at(-1);
  const endingType = getEndingType(session, report);
  const showPersonaMatch = report.personaMatchPercent !== undefined;

  function exportSummary() {
    const text = [
      "[AI 분신 단톡방 결과]",
      `모드: ${GAME_MODES[session.mode].label}`,
      `플레이 스타일: ${report.playStyleTitle}`,
      `결말: ${endingType}`,
      `승리 진영: ${report.endingJudgement.winnerSide}`,
      `판정: ${report.endingJudgement.isPlayerVictory ? "승리" : "패배"}`,
      showPersonaMatch ? `AI 분신 일치율: ${report.personaMatchPercent}%` : "AI 분신 일치율: 분신 생성 없음",
      `핵심 증거: ${finalClue?.name || "핵심 증거 부족"}`,
      "",
      "[사건 기록]",
      ...session.timeline.map((event) => `${event.turn}턴 - ${event.title}: ${event.detail}`),
      "",
      "[대화 로그]",
      ...session.chatLog.map((message) => `${message.playerName}: ${message.content}`)
    ].join("\n");
    navigator.clipboard.writeText(text);
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-[8px] border border-kakao/30 bg-kakao/10 p-8 text-center shadow-glow">
        <p className="text-sm font-black text-kakao">{GAME_MODES[session.mode].label} 모드 피날레</p>
        <h1 className="mt-3 text-4xl font-black">단톡방 정산 리포트</h1>
        <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-200">{report.summary}</p>
      </header>

      <div className={`grid gap-5 ${showPersonaMatch ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        {showPersonaMatch && (
          <article className="rounded-[8px] border border-kakao/30 bg-panel p-6">
            <p className="text-sm font-bold text-kakao">AI 분신 일치율</p>
            <div className="mt-4 text-6xl font-black">{report.personaMatchPercent}%</div>
            <div className="mt-5 h-3 rounded-full bg-black/30">
              <div className="h-3 rounded-full bg-kakao" style={{ width: `${report.personaMatchPercent}%` }} />
            </div>
            {report.aiReport && <p className="mt-4 text-sm leading-6 text-slate-300">{report.aiReport}</p>}
          </article>
        )}

        <article className="rounded-[8px] border border-line bg-panel p-6">
          <p className="text-sm font-bold text-slate-400">플레이 스타일</p>
          <h2 className="mt-4 text-3xl font-black text-white">{report.playStyleTitle}</h2>
          <p className="mt-4 text-sm leading-6 text-slate-300">이번 판에서 당신의 대화 방식과 선택 흐름을 기준으로 산출했습니다.</p>
        </article>

        <article className="rounded-[8px] border border-line bg-panel p-6">
          <p className="text-sm font-bold text-slate-400">도달한 엔딩</p>
          <h2 className="mt-4 text-3xl font-black text-clue">{endingType}</h2>
          <p className="mt-4 text-sm leading-6 text-slate-300">핵심 결과: {report.endingJudgement.reason}</p>
        </article>
      </div>

      <article className={`rounded-[8px] border p-6 ${report.endingJudgement.isPlayerVictory ? "border-emerald-400/30 bg-emerald-400/10" : "border-rose-400/30 bg-rose-400/10"}`}>
        <p className="text-sm font-bold text-slate-300">승패 판정</p>
        <h2 className="mt-2 text-3xl font-black">{report.endingJudgement.isPlayerVictory ? "승리" : "패배"} · {report.endingJudgement.winnerSide}</h2>
        <p className="mt-3 leading-7 text-slate-100">{report.endingJudgement.reason}</p>
      </article>

      <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
        <article className="rounded-[8px] border border-line bg-panel p-6">
          <h2 className="text-xl font-black">사건 기록</h2>
          <div className="mt-4 space-y-3">
            {session.timeline.length > 0 ? session.timeline.map((event) => (
              <div key={`${event.turn}-${event.title}`} className="rounded-[8px] bg-white/[0.04] p-4">
                <p className="font-bold text-kakao">{event.turn}턴 · {event.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{event.detail}</p>
              </div>
            )) : <p className="text-slate-500">기록된 사건이 없습니다.</p>}
          </div>
        </article>

        <article className="rounded-[8px] border border-line bg-panel p-6">
          <h2 className="text-xl font-black">확보한 증거물</h2>
          <div className="mt-4 space-y-3">
            {session.discoveredClues.length > 0 ? session.discoveredClues.map((clue) => (
              <div key={clue.id} className="rounded-[8px] bg-white/[0.04] p-4">
                <p className="font-bold">{clue.name}</p>
                <p className="mt-2 text-sm text-slate-300">{clue.foundAt} · {clue.discoveredTurn}턴 발견</p>
              </div>
            )) : <p className="text-slate-500">확보한 증거물이 없습니다.</p>}
          </div>
        </article>
      </div>

      <article className="rounded-[8px] border border-line bg-panel p-6">
        <h2 className="text-xl font-black">친구 관계 변화도</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {session.players.map((player) => {
            const state = session.playerStates.find((item) => item.playerId === player.id);
            const role = session.playerRoles.find((item) => item.playerId === player.id);
            return (
              <div key={player.id} className="rounded-[8px] bg-white/[0.04] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">{player.name}</p>
                    {role && <p className="text-xs text-slate-500">{role.roleName}</p>}
                  </div>
                  <span className="text-xs text-slate-400">{player.kind === "ai" ? "AI" : "HUMAN"}</span>
                </div>
                <p className="mt-2 text-sm text-slate-300">신뢰 {state?.trust ?? 50} · 의심 {state?.suspicion ?? 30} · 호감 {state?.affection ?? 45}</p>
              </div>
            );
          })}
        </div>
      </article>

      <article className="rounded-[8px] border border-line bg-panel p-6">
        <h2 className="text-xl font-black">주요 선택 요약</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {report.playerChoices.map((choice) => (
            <div key={choice.playerName} className="rounded-[8px] bg-white/[0.04] p-4">
              <p className="font-bold">{choice.playerName}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{choice.summary}</p>
            </div>
          ))}
        </div>
      </article>

      <div className="flex flex-wrap justify-center gap-3">
        <button onClick={exportSummary} className="rounded-[8px] bg-kakao px-5 py-3 font-black text-black transition hover:scale-[1.02]">
          이 단톡방 대화 내용 내보내기 및 정산하기
        </button>
        <button onClick={onRestart} className="rounded-[8px] bg-white px-5 py-3 font-black text-black transition hover:scale-[1.02] hover:bg-kakao">
          새 게임 만들기
        </button>
      </div>
    </section>
  );
}
