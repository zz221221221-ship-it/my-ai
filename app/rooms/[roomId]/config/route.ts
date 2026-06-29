import { NextResponse } from "next/server";
import { authenticate, requireRoom, toRoomView, updateRoomConfig } from "@/lib/multiplayer/roomStore";
import { readRoomAuth, roomError } from "@/lib/multiplayer/http";
import type { RoomConfig } from "@/lib/multiplayer/types";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await context.params;
    const room = requireRoom(roomId);
    const auth = readRoomAuth(request);
    authenticate(room, auth.playerId, auth.token);
    const patch = (await request.json()) as Partial<RoomConfig>;
    updateRoomConfig(room, auth.playerId, patch);
    return NextResponse.json(toRoomView(room, auth.playerId));
  } catch (error) {
    return roomError(error);
  }
}
