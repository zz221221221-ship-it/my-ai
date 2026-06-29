"use client";

import ChatRoom from "@/components/ChatRoom";
import InvestigationPanel from "@/components/InvestigationPanel";
import TurnInput from "@/components/TurnInput";
import type { RoomView } from "@/lib/multiplayer/types";

const STATUS_LABEL = {
  submitted: "🟢 제출 완료",
  typing: "🟡 입력 중",
  waiting: "⚪ 아직 입력 안 함"
} as const;

export default function MultiplayerGame({
  room,
  viewerPlayerId,
  submitting,
  onSubmit
}: {
  room: RoomView;
  viewerPlayerId: string;
  submitting: boolean;
  onSubmit: (content: string) => Promise<boolean>;
}) {
  const session = room.session;
  if (!session) return null;
  const viewer = session.players.find((player) => player.id === viewerPlayerId);
  const submitted = room.submittedPlayers.includes(viewerPlayerId);
  const completed = room.submittedPlayers.length;
  const total = room.players.length;
  const lastMasterUpdate = session.turnHistory.at(-1)?.masterUpdate || null;

  return (
    <main className="h-screen overflow-hidden bg-ink text-white">
      <div className="grid h-screen w-full lg:grid-cols-[72%_28%]">
        <section className="flex h-screen flex-col overflow-hidden bg-[#0d111b]">
          <div className="border-b border-line bg-panel/95 px-4 py-3">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-kakao">💬 실제 플레이어가 입력 중입니다. 잠시 기다려주세요.</p>
                <p className="mt-1 text-xs text-slate-400">현재 {completed} / {total}명 입력 완료 · 방 {room.roomId}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {room.players.map((player) => (
                  <span key={player.id} className="rounded-full border border-line bg-black/30 px-3 py-1.5">
                    {STATUS_LABEL[player.submissionStatus]} · {player.nickname}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <ChatRoom session={session} isResolving={room.processingTurn || submitting} pendingHumanMessages={{}} />
          {viewer && room.gameState === "playing" && (
            <TurnInput
              humans={[viewer]}
              turn={session.currentTurn}
              actionHints={session.actionHints}
              disabled={submitted || submitting || room.processingTurn}
              onSubmit={(messages) => onSubmit(messages[viewer.id] || "")}
            />
          )}
          {submitted && !room.processingTurn && (
            <p className="border-t border-line bg-panel p-4 text-center text-sm font-bold text-emerald-200">제출 완료 · 다른 플레이어를 기다리는 중입니다.</p>
          )}
        </section>
        <InvestigationPanel session={session} lastMasterUpdate={lastMasterUpdate} viewerPlayerId={viewerPlayerId} />
      </div>
    </main>
  );
}
