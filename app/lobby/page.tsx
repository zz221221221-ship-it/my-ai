"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createMultiplayerRoom, joinMultiplayerRoom } from "@/lib/multiplayer/client";

export default function LobbyEntryPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState("");

  async function createRoom() {
    if (!nickname.trim() || busy) return;
    setBusy("create");
    setError("");
    try {
      const result = await createMultiplayerRoom(nickname);
      router.push(`/room/${result.roomId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "방을 만들지 못했습니다.");
      setBusy(null);
    }
  }

  async function joinRoom() {
    if (!nickname.trim() || roomCode.trim().length !== 6 || busy) return;
    setBusy("join");
    setError("");
    try {
      const result = await joinMultiplayerRoom(roomCode.trim(), nickname);
      router.push(`/room/${result.roomId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "방에 참가하지 못했습니다.");
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-ink px-5 py-10 text-white">
      <section className="mx-auto max-w-3xl">
        <button onClick={() => router.push("/")} className="text-sm font-bold text-slate-400 hover:text-white">← 메인으로</button>
        <header className="mt-6 rounded-[8px] border border-kakao/30 bg-kakao/10 p-6">
          <p className="text-sm font-black text-kakao">FRIENDS MULTIPLAYER</p>
          <h1 className="mt-2 text-3xl font-black">친구와 플레이하기</h1>
          <p className="mt-3 text-slate-300">닉네임을 정하고 새 방을 만들거나 6자리 초대 코드를 입력하세요.</p>
        </header>

        <label className="mt-6 block rounded-[8px] border border-line bg-panel p-5">
          <span className="text-sm font-black">내 닉네임</span>
          <input
            value={nickname}
            onChange={(event) => setNickname(event.target.value.slice(0, 16))}
            placeholder="예: 김민수"
            className="mt-3 w-full rounded-[8px] border border-line bg-black/30 px-4 py-3 outline-none focus:border-kakao"
          />
        </label>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <section className="rounded-[8px] border border-line bg-panel p-5">
            <h2 className="text-xl font-black">새 방 만들기</h2>
            <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">방장이 모드, 턴 수, 실제 인원과 AI 분신을 설정합니다.</p>
            <button
              onClick={createRoom}
              disabled={!nickname.trim() || Boolean(busy)}
              className="mt-5 w-full rounded-[8px] bg-kakao px-4 py-3 font-black text-black disabled:bg-slate-700 disabled:text-slate-400"
            >
              {busy === "create" ? "방 만드는 중..." : "새 방 만들기"}
            </button>
          </section>

          <section className="rounded-[8px] border border-line bg-panel p-5">
            <h2 className="text-xl font-black">방 참가하기</h2>
            <input
              value={roomCode}
              onChange={(event) => setRoomCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              onKeyDown={(event) => event.key === "Enter" && joinRoom()}
              placeholder="6자리 방 코드"
              className="mt-3 w-full rounded-[8px] border border-line bg-black/30 px-4 py-3 text-center text-xl font-black tracking-[0.3em] uppercase outline-none focus:border-kakao"
            />
            <button
              onClick={joinRoom}
              disabled={!nickname.trim() || roomCode.length !== 6 || Boolean(busy)}
              className="mt-3 w-full rounded-[8px] border border-kakao px-4 py-3 font-black text-kakao disabled:border-slate-700 disabled:text-slate-500"
            >
              {busy === "join" ? "참가하는 중..." : "방 참가"}
            </button>
          </section>
        </div>
        {error && <p className="mt-5 rounded-[8px] border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</p>}
      </section>
    </main>
  );
}
