import { NextResponse } from "next/server";
import { authenticate, requireRoom, startRoom, toRoomView } from "@/lib/multiplayer/roomStore";
import { readRoomAuth, roomError } from "@/lib/multiplayer/http";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await context.params;
    const room = requireRoom(roomId);
    const auth = readRoomAuth(request);
    authenticate(room, auth.playerId, auth.token);
    startRoom(room, auth.playerId);
    return NextResponse.json(toRoomView(room, auth.playerId));
  } catch (error) {
    return roomError(error);
  }
}
