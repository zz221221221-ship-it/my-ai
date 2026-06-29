"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import MultiplayerGame from "@/components/multiplayer/MultiplayerGame";
import RoomLobby from "@/components/multiplayer/RoomLobby";
import { saveSession } from "@/lib/gameEngine";
import {
  joinMultiplayerRoom,
  loadRoomCredentials,
  roomRequest
} from "@/lib/multiplayer/client";
import type { RoomConfig, RoomCredentials, RoomView } from "@/lib/multiplayer/types";

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = String(params.roomId || "").toUpperCase();
  const [credentials, setCredentials] = useState<RoomCredentials | null | undefined>(undefined);
  const [room, setRoom] = useState<RoomView | null>(null);
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const resultOpened = useRef(false);

  const applyRoom = useCallback((next: RoomView) => {
    setRoom((current) => {
      if (current && next.revision < current.revision) {
        if (process.env.NODE_ENV !== "production") {
          console.log("[RoomPage] ignored stale polling response", {
            currentRevision: current.revision,
            staleRevision: next.revision
          });
        }
        return current;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    setCredentials(loadRoomCredentials(roomId));
  }, [roomId]);

  const refresh = useCallback(async () => {
    if (!credentials) return;
    try {
      const next = await roomRequest<RoomView>(roomId, credentials);
      applyRoom(next);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "방 상태를 불러오지 못했습니다.");
    }
  }, [applyRoom, credentials, roomId]);

  useEffect(() => {
    if (!credentials) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2000);
    return () => window.clearInterval(timer);
  }, [credentials, refresh]);

  useEffect(() => {
    if (room?.gameState !== "ended" || !room.session || resultOpened.current) return;
    resultOpened.current = true;
    saveSession(room.session);
    router.push("/result");
  }, [room, router]);

  async function joinFromInvite() {
    if (!nickname.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await joinMultiplayerRoom(roomId, nickname);
      setCredentials({ roomId: result.roomId, playerId: result.playerId, token: result.token });
      applyRoom(result.room);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "방에 참가하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function mutate(path: string, body?: unknown) {
    if (!credentials) return;
    setBusy(true);
    setError("");
    try {
      const next = await roomRequest<RoomView>(roomId, credentials, path, {
        method: "POST",
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      applyRoom(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "요청을 처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function submitTurn(content: string) {
    if (!credentials || !room?.session) return false;
    setSubmitting(true);
    setError("");
    try {
      const next = await roomRequest<RoomView>(roomId, credentials, "/submit", {
        method: "POST",
        body: JSON.stringify({ turn: room.currentTurn, content })
      });
      applyRoom(next);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "턴을 제출하지 못했습니다.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  if (credentials === undefined) {
    return <main className="flex min-h-screen items-center justify-center bg-ink text-slate-300">방 정보를 확인하는 중...</main>;
  }

  if (!credentials) {
    return (
      <main className="min-h-screen bg-ink px-5 py-12 text-white">
        <section className="mx-auto max-w-lg rounded-[8px] border border-line bg-panel p-6">
          <p className="text-sm font-black text-kakao">초대받은 방</p>
          <h1 className="mt-2 text-3xl font-black">방 코드 {roomId}</h1>
          <p className="mt-3 text-sm text-slate-400">사용할 닉네임을 입력하면 대기실에 참가합니다.</p>
          <input
            value={nickname}
            onChange={(event) => setNickname(event.target.value.slice(0, 16))}
            onKeyDown={(event) => event.key === "Enter" && void joinFromInvite()}
            placeholder="닉네임"
            className="mt-5 w-full rounded-[8px] border border-line bg-black/30 px-4 py-3 outline-none focus:border-kakao"
          />
          <button
            onClick={() => void joinFromInvite()}
            disabled={!nickname.trim() || busy}
            className="mt-3 w-full rounded-[8px] bg-kakao px-4 py-3 font-black text-black disabled:bg-slate-700"
          >
            {busy ? "참가하는 중..." : "대기실 참가"}
          </button>
          {error && <p className="mt-4 text-sm text-rose-200">{error}</p>}
        </section>
      </main>
    );
  }

  if (!room) {
    return <main className="flex min-h-screen items-center justify-center bg-ink text-slate-300">대기실을 불러오는 중...</main>;
  }

  if (room.gameState === "playing") {
    return (
      <>
        {error && <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-[8px] bg-rose-500 px-4 py-2 text-sm font-bold text-white">{error}</div>}
        <MultiplayerGame room={room} viewerPlayerId={credentials.playerId} submitting={submitting} onSubmit={submitTurn} />
      </>
    );
  }

  return (
    <>
      {error && <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-[8px] bg-rose-500 px-4 py-2 text-sm font-bold text-white">{error}</div>}
      <RoomLobby
        room={room}
        viewerPlayerId={credentials.playerId}
        busy={busy}
        onConfig={async (patch: Partial<RoomConfig>) => mutate("/config", patch)}
        onReady={async () => mutate("/ready")}
        onStart={async () => mutate("/start")}
      />
    </>
  );
}
