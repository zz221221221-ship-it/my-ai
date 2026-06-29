import { NextResponse } from "next/server";
import { authenticate, requireRoom, toRoomView } from "@/lib/multiplayer/roomStore";
import { submitRoomTurn } from "@/lib/multiplayer/resolveTurn";
import { readRoomAuth, roomError } from "@/lib/multiplayer/http";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await context.params;
    const room = requireRoom(roomId);
    const auth = readRoomAuth(request);
    authenticate(room, auth.playerId, auth.token);
    const body = (await request.json()) as { turn?: number; content?: string };
    await submitRoomTurn(room, auth.playerId, Number(body.turn), body.content || "");
    return NextResponse.json(toRoomView(room, auth.playerId));
  } catch (error) {
    return roomError(error);
  }
}
