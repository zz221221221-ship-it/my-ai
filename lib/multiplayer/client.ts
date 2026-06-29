import type { RoomCredentials, RoomView } from "./types";

const CREDENTIALS_KEY = "ai-persona-room-credentials";

type CredentialMap = Record<string, RoomCredentials>;

function readCredentialMap(): CredentialMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(CREDENTIALS_KEY) || "{}") as CredentialMap;
  } catch {
    return {};
  }
}

export function saveRoomCredentials(credentials: RoomCredentials) {
  const map = readCredentialMap();
  map[credentials.roomId] = credentials;
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(map));
}

export function loadRoomCredentials(roomId: string) {
  return readCredentialMap()[roomId.toUpperCase()] || null;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "요청을 처리하지 못했습니다.");
  return data;
}

export async function createMultiplayerRoom(nickname: string) {
  const result = await parseResponse<RoomCredentials & { room: RoomView }>(
    await fetch("/rooms/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname })
    })
  );
  saveRoomCredentials(result);
  return result;
}

export async function joinMultiplayerRoom(roomId: string, nickname: string) {
  const result = await parseResponse<RoomCredentials & { room: RoomView }>(
    await fetch("/rooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: roomId.toUpperCase(), nickname })
    })
  );
  saveRoomCredentials(result);
  return result;
}

export async function roomRequest<T>(roomId: string, credentials: RoomCredentials, path = "", init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("x-room-player", credentials.playerId);
  headers.set("x-room-token", credentials.token);
  if (init?.body) headers.set("Content-Type", "application/json");
  return parseResponse<T>(
    await fetch(`/rooms/${roomId}${path}`, {
      ...init,
      cache: "no-store",
      headers
    })
  );
}
