import { createInitialActionHints } from "./gameEngine";
import {
  advanceWorldState,
  createActionResult,
  createEvidenceClue,
  createPublicNotice,
  createStoryProgress,
  createTimelineEvent,
  isInvestigativeAction,
  summarizePrimaryAction,
  updatePlayerStatesByTurn
} from "./gameRules";
import { createMockPersona } from "./persona";
import { assignSpeechAct, classifyIntent, createPersonaSpeech, normalizeSpeech, type SpeechAct } from "./personaSpeech";
import type {
  CaseBriefing,
  ChatMessage,
  EvidenceClue,
  GameMasterUpdate,
  GameMode,
  PersonaProfile,
  PersonaSource,
  Player,
  PlayerRole,
  PlayerState,
  SpokenLine,
  WorldState
} from "./types";

type AiAction = "persona" | "turnMessages" | "gameMaster";

export interface AiTurnMessagesResult {
  messages: Record<string, string>;
  newSpokenLines: SpokenLine[];
  newUsedSpeechActs: Record<string, string[]>;
}

export interface AiTurnMessagesInput {
  aiPlayers: Player[];
  mode: GameMode;
  situation: string;
  caseBriefing: CaseBriefing;
  discoveredClues: EvidenceClue[];
  turnGoal: string;
  mySecret: string;
  playerStates: PlayerState[];
  playerRoles?: PlayerRole[];
  worldState: WorldState;
  actionResult?: string;
  storyProgress?: string;
  publicNotice?: string;
  turn: number;
  chatLog: ChatMessage[];
  spokenLineHistory?: SpokenLine[];
  usedSpeechActs?: Record<string, string[]>;
}

async function postAi<T>(action: AiAction, payload: unknown, fallback: () => T): Promise<T> {
  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload })
    });
    if (!response.ok) return fallback();
    return (await response.json()) as T;
  } catch {
    return fallback();
  }
}

export function createFallbackTurnMessages(input: AiTurnMessagesInput): AiTurnMessagesResult {
  const messages: Record<string, string> = {};
  const newSpokenLines: SpokenLine[] = [];
  const newUsedSpeechActs: Record<string, string[]> = {};
  const usedThisTurn: SpeechAct[] = [];
  const alreadySaidThisTurn: string[] = [];
  const lastHumanText = input.chatLog.filter((message) => message.type !== "system" && !message.isAi).at(-1)?.content || "";
  const intent = classifyIntent(lastHumanText);

  input.aiPlayers.forEach((player, index) => {
    const role = input.playerRoles?.find((item) => item.playerId === player.id);
    const playerState = input.playerStates.find((item) => item.playerId === player.id);
    const recentActs = (input.usedSpeechActs?.[player.id] || []).slice(-3) as SpeechAct[];
    const assignedSpeechAct = assignSpeechAct({
      player,
      playerIndex: index,
      mode: input.mode,
      turn: input.turn,
      playerState,
      role,
      usedActs: [...usedThisTurn, ...recentActs],
      lastHumanText,
      intent
    });
    usedThisTurn.push(assignedSpeechAct);

    const content = createPersonaSpeech({
      player,
      playerIndex: index,
      mode: input.mode,
      turn: input.turn,
      situation: input.situation,
      caseMemo: input.caseBriefing.memoLines,
      discoveredClues: input.discoveredClues,
      turnGoal: input.turnGoal,
      mySecret: input.mySecret,
      playerStates: input.playerStates,
      playerRoles: input.playerRoles,
      worldState: input.worldState,
      actionResult: input.actionResult,
      storyProgress: input.storyProgress,
      publicNotice: input.publicNotice,
      chatLog: input.chatLog,
      assignedSpeechAct,
      alreadySaidThisTurn,
      intent
    });

    messages[player.id] = content;
    alreadySaidThisTurn.push(content);
    newSpokenLines.push({
      playerId: player.id,
      playerName: player.name,
      turn: input.turn,
      original: content,
      normalized: normalizeSpeech(content),
      speechAct: assignedSpeechAct,
      intent
    });
    newUsedSpeechActs[player.id] = [...(input.usedSpeechActs?.[player.id] || []), assignedSpeechAct].slice(-10);
  });

  return { messages, newSpokenLines, newUsedSpeechActs };
}

export function mockGameMasterUpdate(input: {
  mode: GameMode;
  turn: number;
  messages: ChatMessage[];
  situation: string;
  discoveredClues: EvidenceClue[];
  playerStates: PlayerState[];
  playerRoles?: PlayerRole[];
  worldState: WorldState;
}): GameMasterUpdate {
  const actionText = summarizePrimaryAction(input.messages);
  const eventPool: Record<GameMode, string> = {
    deduction: "질문을 받은 사람의 답변 때문에 알리바이가 다시 흔들렸다.",
    survival: "대원들의 반응이 엇갈리며 빠른 선택이 필요한 분위기가 됐다.",
    politics: "방금 발언이 회의실의 동맹 구도를 조금 흔들었다.",
    romance: "누군가의 반응이 어색해지며 고백 편지를 둘러싼 감정이 흔들렸다.",
    drama: "한 사람의 반응 때문에 오래된 기억이 다시 대화 위로 올라왔다."
  };
  const worldState = advanceWorldState(input.mode, input.worldState, input.turn, actionText);
  const evidence = isInvestigativeAction(actionText)
    ? createEvidenceClue(input.mode, input.turn, input.discoveredClues, actionText)
    : undefined;
  const eventChange = evidence ? undefined : eventPool[input.mode];
  const actionResult = createActionResult(input.messages, evidence);
  const storyProgress = createStoryProgress(input.mode, input.messages, evidence, worldState);
  const publicNotice = createPublicNotice(worldState);
  const timelineEvent = createTimelineEvent(input.turn, evidence, eventChange);
  const playerStates = updatePlayerStatesByTurn(input.playerStates, input.messages, input.playerRoles || []);
  const goals: Record<GameMode, string> = {
    deduction: evidence ? `${evidence.name}과 연결되는 모순을 찾아라.` : "방금 답변에서 어긋난 부분을 찾아라.",
    romance: "누가 마음을 숨기거나 서운해하는지 살펴라.",
    drama: "방금 건드린 과거가 누구에게 상처였는지 살펴라.",
    politics: "누가 누구의 편으로 움직이는지 살펴라.",
    survival: "남은 자원과 위험 앞에서 하나를 선택하라."
  };

  return {
    noticeTitle: "시스템",
    noticeBody: evidence ? `${evidence.name}이 공개됐다.` : eventChange || input.situation,
    publicNotice,
    actionResult,
    storyProgress,
    newClue: evidence?.name,
    newEvidence: evidence,
    eventChange,
    nextSituation: evidence ? `${evidence.name}이 발견되며 분위기가 달라졌다.` : eventChange || input.situation,
    worldState,
    timelineEvent,
    turnGoal: goals[input.mode],
    actionHints: createInitialActionHints(input.mode),
    playerStates
  };
}

export async function generatePersona(input: {
  source: PersonaSource;
  rawText: string;
  index?: number;
  preferredName?: string;
}): Promise<PersonaProfile> {
  return postAi<PersonaProfile>("persona", input, () => createMockPersona(input));
}

export async function generateAiTurnMessages(input: AiTurnMessagesInput): Promise<AiTurnMessagesResult> {
  return postAi<AiTurnMessagesResult>("turnMessages", input, () => createFallbackTurnMessages(input));
}

export async function generateGameMasterUpdate(input: {
  mode: GameMode;
  turn: number;
  messages: ChatMessage[];
  situation: string;
  discoveredClues: EvidenceClue[];
  playerStates: PlayerState[];
  playerRoles?: PlayerRole[];
  worldState: WorldState;
}): Promise<GameMasterUpdate> {
  return postAi<GameMasterUpdate>("gameMaster", input, () => mockGameMasterUpdate(input));
}
