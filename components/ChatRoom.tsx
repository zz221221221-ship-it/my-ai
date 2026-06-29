"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChatMessage, GameSession, Player } from "@/lib/types";

function SituationGuidanceCard({ session }: { session: GameSession }) {
  const [collapsed, setCollapsed] = useState(false);
  const role = session.playerRoles.find((r) => r.playerId === session.players.find((p) => p.kind === "human")?.id);
  const suggestions = role?.actionScope || session.actionHints.slice(0, 3).map((h) => h.naturalMessage);

  return (
    <div className="mb-4 rounded-[12px] border border-kakao/40 bg-gradient-to-br from-kakao/15 to-kakao/5 p-5 shadow-glow">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between text-left"
      >
        <p className="text-sm font-black text-kakao">📋 상황 안내</p>
        <span className="text-xs text-slate-400">{collapsed ? "펼치기" : "접기"}</span>
      </button>

      {!collapsed && (
        <div className="mt-4 space-y-4 text-sm">
          <div>
            <p className="mb-1 font-bold text-slate-200">🔍 현재 사건</p>
            <p className="leading-6 text-slate-300">{session.caseBriefing.mainIncident}</p>
          </div>

          <div>
            <p className="mb-1 font-bold text-slate-200">👤 내 입장</p>
            <p className="leading-6 text-slate-300">
              {role ? `${role.roleName} · ${role.victoryGoal}` : session.mySecret}
            </p>
          </div>

          <div>
            <p className="mb-1 font-bold text-slate-200">💬 지금 할 수 있는 말</p>
            <ul className="space-y-1 text-slate-300">
              {suggestions.slice(0, 3).map((suggestion, i) => (
                <li key={i} className="rounded-md bg-white/5 px-3 py-2 text-sm">· {suggestion}</li>
              ))}
              <li className="rounded-md bg-white/5 px-3 py-2 text-sm">· 다른 사람을 의심하기</li>
              <li className="rounded-md bg-white/5 px-3 py-2 text-sm">· 감정적으로 반응하기</li>
            </ul>
          </div>

          <div className="rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2">
            <p className="text-xs leading-5 text-amber-200">
              💡 정답을 맞히려고 하기보다 실제 단톡방에서 말하듯이 자연스럽게 반응하세요.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function stripKakaoRawFormat(content: string) {
  return content
    .replace(/^\s*\[[^\]]+\]\s*\[(오전|오후)\s*\d{1,2}:\d{2}\]\s*/g, "")
    .replace(/^\s*(오전|오후)\s*\d{1,2}:\d{2}\s*/g, "")
    .replace(/^\s*[^:：]{1,20}\s*[:：]\s*/, "")
    .trim();
}

function playerInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

function Bubble({ message, player, index, revealed }: { message: ChatMessage; player?: Player; index: number; revealed: boolean }) {
  const messageType = message.type || (message.isAi ? "ai" : "user");
  if (messageType === "system") {
    return (
      <div className={`chat-pop flex justify-center py-2 ${revealed ? "opacity-100" : "pointer-events-none opacity-0"}`} style={{ animationDelay: `${index * 120}ms` }}>
        <p className="max-w-2xl text-center text-base leading-7 text-slate-300">
          <span className="mr-2 font-bold text-kakao">[시스템]</span>
          {message.content}
        </p>
      </div>
    );
  }

  const isHuman = messageType === "user";
  const cleanContent = stripKakaoRawFormat(message.content);

  return (
    <article className={`chat-pop flex gap-3 ${isHuman ? "justify-end" : "justify-start"} ${revealed ? "opacity-100" : "pointer-events-none opacity-0"}`} style={{ animationDelay: `${index * 120}ms` }}>
      {!isHuman && (
        <div className="mt-5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-sm font-black text-black" style={{ backgroundColor: player?.color || "#82f3ff" }}>
          {playerInitial(message.playerName)}
        </div>
      )}
      <div className={`max-w-[72%] ${isHuman ? "items-end" : "items-start"} flex flex-col`}>
        <div className={`mb-1 flex items-center gap-2 text-xs font-bold ${isHuman ? "justify-end text-kakao" : "text-slate-300"}`}>
          <span>{message.playerName}</span>
        </div>
        <div className={`rounded-[8px] px-4 py-3 text-sm leading-6 shadow-sm ${isHuman ? "rounded-tr-sm bg-kakao text-black" : "rounded-tl-sm bg-slate-800 text-slate-50"}`}>
          <p className="whitespace-pre-wrap">{cleanContent}</p>
        </div>
      </div>
      {isHuman && (
        <div className="mt-5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-sm font-black text-black" style={{ backgroundColor: player?.color || "#fee500" }}>
          {playerInitial(message.playerName)}
        </div>
      )}
    </article>
  );
}

export default function ChatRoom({
  session,
  isResolving,
  pendingHumanMessages
}: {
  session: GameSession;
  isResolving: boolean;
  pendingHumanMessages: Record<string, string>;
}) {
  const latestTurn = session.turnHistory.at(-1)?.turn || 0;
  const latestMessageCount = session.turnHistory.at(-1)?.messages.length || 0;
  const [visibleMessages, setVisibleMessages] = useState<Record<number, number>>({});

  const playerMap = useMemo(() => new Map(session.players.map((player) => [player.id, player])), [session.players]);
  const typingPlayers = session.players.filter((player) => player.kind === "ai").slice(0, 3);

  useEffect(() => {
    if (!latestTurn) return;
    setVisibleMessages((prev) => ({ ...prev, [latestTurn]: 0 }));

    const timers: Array<ReturnType<typeof setTimeout>> = [];
    Array.from({ length: latestMessageCount }).forEach((_, index) => {
      timers.push(setTimeout(() => {
        setVisibleMessages((prev) => ({ ...prev, [latestTurn]: index + 1 }));
      }, 180 + index * 160));
    });

    return () => timers.forEach(clearTimeout);
  }, [latestTurn, latestMessageCount]);

  return (
    <div className="relative flex-1 overflow-hidden bg-[#0b0f19]">
      <div className="h-full overflow-y-auto px-5 pb-32 pt-5">
        <div className="mx-auto max-w-5xl space-y-5">
          <SituationGuidanceCard session={session} />

          {session.turnHistory.length === 0 && (
            <div className="mx-auto max-w-2xl py-2 text-center text-base leading-7 text-slate-300">
              <p><span className="mr-2 font-bold text-kakao">[시스템]</span>{session.caseBriefing.mainIncident}</p>
              <p className="mt-1"><span className="mr-2 font-bold text-kakao">[시스템]</span>{session.caseBriefing.firstQuestion}</p>
            </div>
          )}

          {session.turnHistory.map((turn) => {
            const visibleCount = visibleMessages[turn.turn] ?? turn.messages.length;
            return (
              <section key={turn.turn} className="space-y-4">
                <p className="text-center text-base leading-7 text-slate-300"><span className="mr-2 font-bold text-kakao">[시스템]</span>{turn.turn}턴 메시지가 공개됐다.</p>
                {turn.messages.map((message, index) => (
                  <Bubble key={message.id} message={message} player={playerMap.get(message.playerId)} index={index} revealed={index < visibleCount} />
                ))}
              </section>
            );
          })}

          {isResolving && (
            <section className="rounded-[12px] border border-kakao/30 bg-gradient-to-br from-kakao/10 to-transparent p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-kakao" />
                <p className="text-sm font-black text-kakao">AI 응답 생성 중</p>
              </div>
              <div className="mt-3 space-y-2">
                {typingPlayers.map((player, idx) => (
                  <div key={player.id} className="flex items-center gap-2 text-sm text-slate-300" style={{ animationDelay: `${idx * 200}ms` }}>
                    <div className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-black" style={{ backgroundColor: player.color }}>
                      {playerInitial(player.name)}
                    </div>
                    <span>{player.name}</span>
                    <span className="typing-dots" />
                  </div>
                ))}
              </div>
              {Object.values(pendingHumanMessages).length > 0 && (
                <div className="mt-3 border-t border-line pt-3">
                  {Object.values(pendingHumanMessages).map((message, index) => (
                    <p key={`${message}-${index}`} className="text-xs text-slate-500">
                      <span className="mr-1 text-kakao">→</span> {message.slice(0, 50)}{message.length > 50 ? "..." : ""}
                    </p>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
