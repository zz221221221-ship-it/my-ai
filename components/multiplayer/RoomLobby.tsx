"use client";

import { useState } from "react";
import GameModeSelector from "@/components/GameModeSelector";
import PersonaInput from "@/components/PersonaInput";
import PlayerSetup from "@/components/PlayerSetup";
import type { RoomConfig, RoomView } from "@/lib/multiplayer/types";

export default function RoomLobby({
  room,
  viewerPlayerId,
  busy,
  onConfig,
  onReady,
  onStart
}: {
  room: RoomView;
  viewerPlayerId: string;
  busy: boolean;
  onConfig: (patch: Partial<RoomConfig>) => Promise<void>;
  onReady: () => Promise<void>;
  onStart: () => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const isHost = room.hostId === viewerPlayerId;
  const inviteUrl = typeof window === "undefined" ? `/room/${room.roomId}` : `${window.location.origin}/room/${room.roomId}`;
  const allReady = room.players.length > 0 && room.players.every((player) => player.ready);
  const totalPlayers = room.config.humanLimit + room.config.aiCount;

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="min-h-screen bg-ink px-5 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="grid gap-4 rounded-[8px] border border-kakao/30 bg-panel p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-xs font-black tracking-[0.18em] text-kakao">MULTIPLAYER LOBBY</p>
            <h1 className="mt-2 text-3xl font-black">방 코드 <span className="text-kakao">{room.roomId}</span></h1>
            <p className="mt-2 break-all text-sm text-slate-400">{inviteUrl}</p>
          </div>
          <button onClick={copyInvite} className="rounded-[8px] bg-kakao px-5 py-3 font-black text-black">
            {copied ? "복사 완료" : "초대 링크 복사"}
          </button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_390px]">
          <div className="space-y-6">
            <section className="rounded-[8px] border border-line bg-panel p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">참가자</h2>
                <span className="text-sm font-bold text-slate-400">{room.players.length} / {room.config.humanLimit}명 접속</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {room.players.map((player) => (
                  <article key={player.id} className="flex items-center justify-between rounded-[8px] border border-line bg-black/20 p-4">
                    <div>
                      <p className="font-black">{player.nickname} {player.id === viewerPlayerId && <span className="text-xs text-kakao">(나)</span>}</p>
                      {player.isHost && <p className="mt-1 text-xs font-bold text-amber-200">👑 방장</p>}
                    </div>
                    <span className={player.ready ? "text-emerald-300" : "text-slate-500"}>{player.ready ? "준비 완료" : "대기 중"}</span>
                  </article>
                ))}
              </div>
              {room.players.length < room.config.humanLimit && (
                <p className="mt-4 rounded-[8px] bg-white/[0.04] p-3 text-sm text-slate-400">
                  시작할 때 비어 있는 실제 플레이어 자리 {room.config.humanLimit - room.players.length}개는 AI가 자동으로 채웁니다.
                </p>
              )}
            </section>

            {isHost ? (
              <PersonaInput
                personas={room.config.aiPersonas}
                onAdd={(persona) => void onConfig({ aiPersonas: [...room.config.aiPersonas, persona] })}
                onRemove={(id) => void onConfig({ aiPersonas: room.config.aiPersonas.filter((persona) => persona.id !== id) })}
              />
            ) : (
              <section className="rounded-[8px] border border-line bg-panel p-5 text-slate-300">
                <h2 className="font-black text-white">AI 분신 설정</h2>
                <p className="mt-2 text-sm">방장만 AI를 생성하거나 삭제할 수 있습니다. 게임이 시작되면 설정은 자동으로 잠깁니다.</p>
              </section>
            )}
          </div>

          <aside className="space-y-6">
            {isHost ? (
              <>
                <GameModeSelector value={room.config.gameMode} onChange={(gameMode) => void onConfig({ gameMode })} />
                <PlayerSetup
                  humanCount={room.config.humanLimit}
                  aiCount={room.config.aiCount}
                  personaCount={room.config.aiPersonas.length}
                  maxTurns={room.config.turnLimit}
                  onTurnChange={(turnLimit) => void onConfig({ turnLimit })}
                  onChange={({ humanCount, aiCount }) => void onConfig({ humanLimit: humanCount, aiCount })}
                />
              </>
            ) : (
              <section className="rounded-[8px] border border-line bg-panel p-5 text-sm text-slate-300">
                <h2 className="text-lg font-black text-white">게임 설정</h2>
                <dl className="mt-4 space-y-2">
                  <div className="flex justify-between"><dt>모드</dt><dd className="font-bold text-white">{room.config.gameMode}</dd></div>
                  <div className="flex justify-between"><dt>턴 수</dt><dd className="font-bold text-white">{room.config.turnLimit}턴</dd></div>
                  <div className="flex justify-between"><dt>실제 플레이어</dt><dd className="font-bold text-white">{room.config.humanLimit}명</dd></div>
                  <div className="flex justify-between"><dt>AI 분신</dt><dd className="font-bold text-white">{room.config.aiCount}명</dd></div>
                </dl>
              </section>
            )}

            <button
              onClick={() => void onReady()}
              disabled={busy}
              className={`w-full rounded-[8px] px-5 py-4 font-black ${room.players.find((player) => player.id === viewerPlayerId)?.ready ? "border border-emerald-300 text-emerald-200" : "bg-white text-black"}`}
            >
              {room.players.find((player) => player.id === viewerPlayerId)?.ready ? "준비 취소" : "준비"}
            </button>

            {isHost && (
              <button
                onClick={() => void onStart()}
                disabled={busy || !allReady || totalPlayers < 2}
                className="w-full rounded-[8px] bg-kakao px-5 py-4 font-black text-black disabled:bg-slate-700 disabled:text-slate-400"
              >
                게임 시작
              </button>
            )}
            {!allReady && <p className="text-center text-sm text-amber-200">모든 참가자가 준비하면 시작할 수 있습니다.</p>}
          </aside>
        </div>
      </div>
    </main>
  );
}
