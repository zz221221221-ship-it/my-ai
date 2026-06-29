import { createMockPersona } from "@/lib/persona";
import { createGameSession, createInitialPlayerStates, GAME_MODES, uid } from "@/lib/gameEngine";
import { createPlayerRoles } from "@/lib/gameRules";
import type { GameSession, PersonaProfile, Player } from "@/lib/types";
import type { Room, RoomConfig, RoomCredentials, RoomPlayer, RoomView } from "./types";

const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
const PLAYER_COLORS = ["#60a5fa", "#34d399", "#a78bfa", "#fb923c", "#f472b6", "#facc15"];

type RoomStoreState = {
  rooms: Map<string, Room>;
  tokens: Map<string, string>;
};

declare global {
  var __aiPersonaRoomStore: RoomStoreState | undefined;
}

const state = globalThis.__aiPersonaRoomStore || { rooms: new Map<string, Room>(), tokens: new Map<string, string>() };
globalThis.__aiPersonaRoomStore = state;

function randomCode(length: number) {
  return Array.from({ length }, () => ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)]).join("");
}

function roomTokenKey(roomId: string, playerId: string) {
  return `${roomId}:${playerId}`;
}

function cleanNickname(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 16);
}

function cleanupExpiredRooms() {
  const cutoff = Date.now() - ROOM_TTL_MS;
  for (const [roomId, room] of state.rooms) {
    if (new Date(room.createdAt).getTime() < cutoff) {
      state.rooms.delete(roomId);
      room.players.forEach((player) => state.tokens.delete(roomTokenKey(roomId, player.id)));
    }
  }
}

function createRoomCode() {
  cleanupExpiredRooms();
  let code = randomCode(6);
  while (state.rooms.has(code)) code = randomCode(6);
  return code;
}

function createMember(nickname: string): { player: RoomPlayer; token: string } {
  const player: RoomPlayer = {
    id: uid("member"),
    nickname: cleanNickname(nickname),
    ready: false,
    joinedAt: new Date().toISOString()
  };
  return { player, token: `${uid("token")}-${randomCode(12)}` };
}

export function createRoom(nickname: string): { room: Room; credentials: RoomCredentials } {
  const safeNickname = cleanNickname(nickname);
  if (!safeNickname) throw new Error("닉네임을 입력해주세요.");

  const roomId = createRoomCode();
  const { player, token } = createMember(safeNickname);
  const room: Room = {
    roomId,
    hostId: player.id,
    players: [player],
    messages: [],
    gameState: "lobby",
    currentTurn: 1,
    clues: [],
    publicEvidence: [],
    gameMode: "deduction",
    turnLimit: 8,
    submittedPlayers: [],
    submissions: {},
    createdAt: new Date().toISOString(),
    config: {
      gameMode: "deduction",
      turnLimit: 8,
      humanLimit: 2,
      aiCount: 1,
      aiPersonas: [],
      locked: false
    },
    session: null,
    processingTurn: false,
    revision: 1
  };
  state.rooms.set(roomId, room);
  state.tokens.set(roomTokenKey(roomId, player.id), token);
  return { room, credentials: { roomId, playerId: player.id, token } };
}

export function getRoom(roomId: string) {
  cleanupExpiredRooms();
  return state.rooms.get(roomId.toUpperCase());
}

export function requireRoom(roomId: string) {
  const room = getRoom(roomId);
  if (!room) throw new Error("존재하지 않는 방입니다.");
  return room;
}

export function authenticate(room: Room, playerId: string, token: string) {
  const player = room.players.find((item) => item.id === playerId);
  const validToken = state.tokens.get(roomTokenKey(room.roomId, playerId));
  if (!player || !token || token !== validToken) throw new Error("방 참가 정보가 올바르지 않습니다.");
  return player;
}

export function joinRoom(roomId: string, nickname: string): { room: Room; credentials: RoomCredentials } {
  const room = requireRoom(roomId);
  const safeNickname = cleanNickname(nickname);
  if (!safeNickname) throw new Error("닉네임을 입력해주세요.");
  if (room.gameState !== "lobby") throw new Error("이미 게임이 시작된 방입니다.");
  if (room.players.length >= room.config.humanLimit) throw new Error("방의 실제 플레이어 정원이 가득 찼습니다.");
  if (room.players.some((player) => player.nickname.toLowerCase() === safeNickname.toLowerCase())) {
    throw new Error("이미 사용 중인 닉네임입니다.");
  }

  const { player, token } = createMember(safeNickname);
  room.players.push(player);
  room.revision += 1;
  state.tokens.set(roomTokenKey(room.roomId, player.id), token);
  return { room, credentials: { roomId: room.roomId, playerId: player.id, token } };
}

export function updateRoomConfig(room: Room, hostId: string, patch: Partial<RoomConfig>) {
  if (room.hostId !== hostId) throw new Error("방장만 게임 설정을 변경할 수 있습니다.");
  if (room.gameState !== "lobby" || room.config.locked) throw new Error("게임 시작 후에는 설정을 변경할 수 없습니다.");

  const gameMode = patch.gameMode || room.config.gameMode;
  const turnLimit = [5, 8, 12].includes(Number(patch.turnLimit)) ? Number(patch.turnLimit) : room.config.turnLimit;
  const humanLimit = Math.max(room.players.length, Math.min(6, Number(patch.humanLimit ?? room.config.humanLimit)));
  const aiCount = Math.max(0, Math.min(6 - humanLimit, Number(patch.aiCount ?? room.config.aiCount)));
  const aiPersonas = Array.isArray(patch.aiPersonas) ? patch.aiPersonas.slice(0, aiCount) : room.config.aiPersonas.slice(0, aiCount);

  room.config = { gameMode, turnLimit, humanLimit, aiCount, aiPersonas, locked: false };
  room.gameMode = gameMode;
  room.turnLimit = turnLimit;
  room.revision += 1;
  return room;
}

export function toggleReady(room: Room, playerId: string) {
  const player = room.players.find((item) => item.id === playerId);
  if (!player) throw new Error("참가자를 찾을 수 없습니다.");
  if (room.gameState !== "lobby") throw new Error("대기실에서만 준비 상태를 바꿀 수 있습니다.");
  player.ready = !player.ready;
  room.revision += 1;
  return room;
}

function genericPersona(index: number): PersonaProfile {
  return createMockPersona({
    source: "prompt",
    rawText: `${index + 1}번 AI 참가자. 실제 사람처럼 짧게 대화하고 상황에 맞게 의심하거나 협력한다.`,
    index,
    preferredName: `AI 분신 ${index + 1}`
  });
}

export function startRoom(room: Room, hostId: string) {
  if (room.hostId !== hostId) throw new Error("방장만 게임을 시작할 수 있습니다.");
  if (room.gameState !== "lobby") throw new Error("이미 시작된 게임입니다.");
  if (!room.players.every((player) => player.ready)) throw new Error("모든 참가자가 준비해야 시작할 수 있습니다.");
  if (room.config.humanLimit + room.config.aiCount < 2) throw new Error("사람과 AI를 합쳐 최소 2명이 필요합니다.");

  const missingHumans = Math.max(0, room.config.humanLimit - room.players.length);
  const totalAiCount = room.config.aiCount + missingHumans;
  const personas = Array.from({ length: totalAiCount }, (_, index) => room.config.aiPersonas[index] || genericPersona(index));
  const base = createGameSession({
    mode: room.config.gameMode,
    humanCount: room.players.length,
    aiPersonas: personas,
    maxTurns: room.config.turnLimit
  });
  const humanPlayers: Player[] = room.players.map((member, index) => ({
    id: member.id,
    name: member.nickname,
    kind: "human",
    color: PLAYER_COLORS[index % PLAYER_COLORS.length]
  }));
  const aiPlayers: Player[] = base.players.filter((player) => player.kind === "ai").map((player, index) => ({
    ...player,
    color: PLAYER_COLORS[(humanPlayers.length + index) % PLAYER_COLORS.length]
  }));
  const players = [...humanPlayers, ...aiPlayers];
  const playerRoles = createPlayerRoles(room.config.gameMode, players, GAME_MODES[room.config.gameMode].secret);
  const session: GameSession = {
    ...base,
    players,
    playerRoles,
    totalPlayers: players.length,
    humanCount: humanPlayers.length,
    aiCount: aiPlayers.length,
    playerStates: createInitialPlayerStates(players),
    hasEnteredChat: true,
    status: "playing",
    mySecret: ""
  };

  room.session = session;
  room.gameState = "playing";
  room.currentTurn = 1;
  room.config.locked = true;
  room.messages = [];
  room.clues = [];
  room.publicEvidence = [];
  room.submittedPlayers = [];
  room.submissions = {};
  room.revision += 1;
  return room;
}

export function toRoomView(room: Room, viewerPlayerId: string): RoomView {
  const viewerRole = room.session?.playerRoles.find((role) => role.playerId === viewerPlayerId);
  const visibleClues = room.clues.filter(
    (clue) => clue.visibility !== "private" || clue.ownerPlayerId === viewerPlayerId
  );
  const session = room.session
    ? {
        ...room.session,
        playerRoles: viewerRole ? [viewerRole] : [],
        mySecret: viewerRole?.secret || "",
        discoveredClues: room.session.discoveredClues.filter(
          (clue) => clue.visibility !== "private" || clue.ownerPlayerId === viewerPlayerId
        )
      }
    : null;

  return {
    roomId: room.roomId,
    hostId: room.hostId,
    players: room.players.map((player) => ({
      ...player,
      isHost: player.id === room.hostId,
      submissionStatus: room.submittedPlayers.includes(player.id)
        ? "submitted"
        : player.id === viewerPlayerId
          ? "typing"
          : "waiting"
    })),
    messages: room.messages,
    gameState: room.gameState,
    currentTurn: room.currentTurn,
    clues: visibleClues,
    publicEvidence: room.publicEvidence,
    gameMode: room.gameMode,
    turnLimit: room.turnLimit,
    submittedPlayers: room.submittedPlayers,
    createdAt: room.createdAt,
    config: room.config,
    session,
    processingTurn: room.processingTurn,
    revision: room.revision
  };
}
