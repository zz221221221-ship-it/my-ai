import { NextResponse } from "next/server";
import { joinRoom, toRoomView } from "@/lib/multiplayer/roomStore";
import { roomError } from "@/lib/multiplayer/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { roomId, nickname } = (await request.json()) as { roomId?: string; nickname?: string };
    const { room, credentials } = joinRoom(roomId || "", nickname || "");
    return NextResponse.json({ ...credentials, room: toRoomView(room, credentials.playerId) });
  } catch (error) {
    return roomError(error);
  }
}
