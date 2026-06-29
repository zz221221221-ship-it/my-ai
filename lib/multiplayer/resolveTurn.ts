import { POST as runExistingAiRoute } from "@/app/api/ai/route";
import type { AiTurnMessagesResult } from "@/lib/ai";
import { createChatMessage, createSystemChatMessages, normalizeHumanTurnInput } from "@/lib/gameEngine";
import { judgeEnding } from "@/lib/gameRules";
import type { GameMasterUpdate, GameSession } from "@/lib/types";
import type { Room } from "./types";

async function runAi<T>(action: "turnMessages" | "gameMaster", payload: unknown): Promise<T> {
  const response = await runExistingAiRoute(
    new Request("http://internal/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload })
    })
  );
  if (!response.ok) throw new Error("AI 진행을 완료하지 못했습니다.");
  return (await response.json()) as T;
}

export async function resolveRoomTurn(room: Room) {
  const session = room.session;
  if (!session) throw new Error("게임 세션이 없습니다.");

  const humanPlayers = session.players.filter((player) => player.kind === "human");
  const aiPlayers = session.players.filter((player) => player.kind === "ai");
  const humanTurnMessages = humanPlayers.map((player) =>
    createChatMessage({
      turn: session.currentTurn,
      player,
      content: normalizeHumanTurnInput(room.submissions[player.id] || "...", session.actionHints)
    })
  );

  const aiResult = await runAi<AiTurnMessagesResult>("turnMessages", {
    aiPlayers,
    mode: session.mode,
    situation: session.situation,
    caseBriefing: session.caseBriefing,
    discoveredClues: session.discoveredClues,
    turnGoal: session.turnGoal,
    mySecret: "",
    playerStates: session.playerStates,
    playerRoles: session.playerRoles,
    worldState: session.worldState,
    actionResult: session.turnHistory.at(-1)?.masterUpdate.actionResult.lines.join(" "),
    storyProgress: session.turnHistory.at(-1)?.masterUpdate.storyProgress.lines.join(" "),
    publicNotice: session.turnHistory.at(-1)?.masterUpdate.publicNotice.lines.join(" "),
    turn: session.currentTurn,
    chatLog: [...session.chatLog.slice(-session.players.length * 3), ...humanTurnMessages],
    spokenLineHistory: session.spokenLineHistory,
    usedSpeechActs: session.usedSpeechActs
  });

  const revealedMessages = [
    ...humanTurnMessages,
    ...aiPlayers.map((player) =>
      createChatMessage({
        turn: session.currentTurn,
        player,
        content: aiResult.messages[player.id] || "..."
      })
    )
  ];
  const masterUpdate = await runAi<GameMasterUpdate>("gameMaster", {
    mode: session.mode,
    turn: session.currentTurn,
    messages: revealedMessages,
    situation: session.situation,
    discoveredClues: session.discoveredClues,
    playerStates: session.playerStates,
    playerRoles: session.playerRoles,
    worldState: session.worldState
  });
  const systemMessages = createSystemChatMessages(session.currentTurn, masterUpdate);
  const turnMessages = [...revealedMessages, ...systemMessages];

  const discoveredClues =
    masterUpdate.newEvidence && !session.discoveredClues.some((clue) => clue.id === masterUpdate.newEvidence?.id)
      ? [...session.discoveredClues, masterUpdate.newEvidence]
      : session.discoveredClues;
  const ended = session.currentTurn >= session.maxTurns;
  const sessionForJudgement: GameSession = {
    ...session,
    chatLog: [...session.chatLog, ...turnMessages],
    discoveredClues,
    worldState: masterUpdate.worldState,
    playerStates: masterUpdate.playerStates
  };
  const nextSession: GameSession = {
    ...session,
    chatLog: [...session.chatLog, ...turnMessages],
    turnHistory: [...session.turnHistory, { turn: session.currentTurn, messages: turnMessages, masterUpdate }],
    situation: masterUpdate.nextSituation,
    discoveredClues,
    worldState: masterUpdate.worldState,
    timeline: [...session.timeline, masterUpdate.timelineEvent],
    turnGoal: masterUpdate.turnGoal,
    actionHints: masterUpdate.actionHints,
    playerStates: masterUpdate.playerStates,
    endingJudgement: ended ? judgeEnding(sessionForJudgement) : session.endingJudgement,
    status: ended ? "ended" : "playing",
    currentTurn: ended ? session.currentTurn : session.currentTurn + 1,
    spokenLineHistory: [...(session.spokenLineHistory || []), ...aiResult.newSpokenLines],
    usedSpeechActs: { ...(session.usedSpeechActs || {}), ...aiResult.newUsedSpeechActs }
  };

  room.session = nextSession;
  room.messages = nextSession.chatLog;
  room.clues = nextSession.discoveredClues;
  room.publicEvidence = nextSession.discoveredClues.filter((clue) => clue.visibility !== "private");
  room.currentTurn = nextSession.currentTurn;
  room.gameState = ended ? "ended" : "playing";
  room.submittedPlayers = [];
  room.submissions = {};
  room.processingTurn = false;
  room.revision += 1;
}

export async function submitRoomTurn(room: Room, playerId: string, turn: number, content: string) {
  if (room.gameState !== "playing" || !room.session) throw new Error("진행 중인 게임이 아닙니다.");
  if (turn !== room.currentTurn) throw new Error("이미 지나간 턴입니다. 방 상태를 새로고침해주세요.");
  if (room.processingTurn) throw new Error("현재 턴의 AI와 GM이 진행 중입니다.");
  if (room.submittedPlayers.includes(playerId)) throw new Error("이미 이번 턴을 제출했습니다.");
  if (!content.trim()) throw new Error("메시지 또는 행동을 입력해주세요.");

  room.submissions[playerId] = content.trim().slice(0, 1000);
  room.submittedPlayers.push(playerId);
  room.revision += 1;

  const allSubmitted = room.players.every((player) => room.submittedPlayers.includes(player.id));
  if (!allSubmitted) return false;

  room.processingTurn = true;
  room.revision += 1;
  try {
    await resolveRoomTurn(room);
  } catch (error) {
    room.processingTurn = false;
    room.submittedPlayers = room.submittedPlayers.filter((id) => id !== playerId);
    delete room.submissions[playerId];
    room.revision += 1;
    throw error;
  }
  return true;
}
