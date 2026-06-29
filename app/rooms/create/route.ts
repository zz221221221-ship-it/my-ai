import { NextResponse } from "next/server";
import { createRoom, toRoomView } from "@/lib/multiplayer/roomStore";
import { roomError } from "@/lib/multiplayer/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { nickname } = (await request.json()) as { nickname?: string };
    const { room, credentials } = createRoom(nickname || "");
    return NextResponse.json({ ...credentials, room: toRoomView(room, credentials.playerId) }, { status: 201 });
  } catch (error) {
    return roomError(error);
  }
}
