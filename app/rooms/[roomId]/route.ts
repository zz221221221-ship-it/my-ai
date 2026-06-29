import { NextResponse } from "next/server";
import { authenticate, requireRoom, toRoomView } from "@/lib/multiplayer/roomStore";
import { readRoomAuth, roomError } from "@/lib/multiplayer/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await context.params;
    const room = requireRoom(roomId);
    const auth = readRoomAuth(request);
    authenticate(room, auth.playerId, auth.token);
    return NextResponse.json(toRoomView(room, auth.playerId), {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    return roomError(error);
  }
}
