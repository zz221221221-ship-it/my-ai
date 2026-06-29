import type { ChatMessage, EvidenceClue, GameMode, GameSession, PersonaProfile } from "@/lib/types";

export type RoomGameState = "lobby" | "playing" | "ended";

export interface RoomPlayer {
  id: string;
  nickname: string;
  ready: boolean;
  joinedAt: string;
}

export interface RoomConfig {
  gameMode: GameMode;
  turnLimit: number;
  humanLimit: number;
  aiCount: number;
  aiPersonas: PersonaProfile[];
  locked: boolean;
}

export interface Room {
  roomId: string;
  hostId: string;
  players: RoomPlayer[];
  messages: ChatMessage[];
  gameState: RoomGameState;
  currentTurn: number;
  clues: EvidenceClue[];
  publicEvidence: EvidenceClue[];
  gameMode: GameMode;
  turnLimit: number;
  submittedPlayers: string[];
  submissions: Record<string, string>;
  createdAt: string;
  config: RoomConfig;
  session: GameSession | null;
  processingTurn: boolean;
  revision: number;
}

export interface RoomPlayerView extends RoomPlayer {
  isHost: boolean;
  submissionStatus: "submitted" | "typing" | "waiting";
}

export interface RoomView {
  roomId: string;
  hostId: string;
  players: RoomPlayerView[];
  messages: ChatMessage[];
  gameState: RoomGameState;
  currentTurn: number;
  clues: EvidenceClue[];
  publicEvidence: EvidenceClue[];
  gameMode: GameMode;
  turnLimit: number;
  submittedPlayers: string[];
  createdAt: string;
  config: RoomConfig;
  session: GameSession | null;
  processingTurn: boolean;
  revision: number;
}

export interface RoomCredentials {
  roomId: string;
  playerId: string;
  token: string;
}
