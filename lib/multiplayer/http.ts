import { NextResponse } from "next/server";

export function roomError(error: unknown, fallbackStatus = 400) {
  const message = error instanceof Error ? error.message : "요청을 처리하지 못했습니다.";
  const status = message.includes("존재하지 않는") ? 404 : message.includes("올바르지") ? 401 : fallbackStatus;
  return NextResponse.json({ error: message }, { status });
}

export function readRoomAuth(request: Request) {
  return {
    playerId: request.headers.get("x-room-player") || "",
    token: request.headers.get("x-room-token") || ""
  };
}
