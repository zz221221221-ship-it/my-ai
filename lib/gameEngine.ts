import { createCaseBriefing } from "./gameIntro";
import { createInitialWorldState, createPlayerRoles, judgeEnding } from "./gameRules";
import type { ActionHint, ChatMessage, GameMasterUpdate, GameMode, GameSession, Player, PlayerState, ResultReport } from "./types";

export const GAME_STORAGE_KEY = "ai-social-deduction-session";

export const GAME_MODES: Record<GameMode, { label: string; scenario: string; initialGoal: string; secret: string; accent: string }> = {
  deduction: {
    label: "추리",
    scenario: "외딴 펜션에서 한 명이 사라졌다. 단체 채팅방에는 마지막 목격 시간만 남아 있다.",
    initialGoal: "실종자의 마지막 행적을 찾아라.",
    secret: "사건 직전 피해자와 짧게 대화했지만 아직 아무에게도 말하지 않았다.",
    accent: "from-cyan-400 to-blue-500"
  },
  survival: {
    label: "생존",
    scenario: "우주선 산소가 줄어들고 있다. 누군가 비상 매뉴얼 일부를 찢어 갔다.",
    initialGoal: "산소를 확보하고 고장 원인을 찾아라.",
    secret: "비상 창고 근처에서 낯선 발소리를 들었다.",
    accent: "from-emerald-300 to-lime-500"
  },
  politics: {
    label: "정치",
    scenario: "왕국의 후계자를 정하기 위한 비밀 회의가 시작됐다. 가짜 칙서가 회의실에 놓여 있다.",
    initialGoal: "가짜 칙서를 가져온 사람을 찾아라.",
    secret: "회의 전 한 후보가 당신에게 조용한 동맹을 제안했다.",
    accent: "from-amber-300 to-red-500"
  },
  romance: {
    label: "연애",
    scenario: "합숙 첫날, 익명의 고백 편지가 공개됐다. 편지 주인은 아직 밝혀지지 않았다.",
    initialGoal: "고백 편지의 주인과 숨겨진 의도를 찾아라.",
    secret: "당신은 편지가 놓인 테이블 근처에 누가 있었는지 봤다.",
    accent: "from-pink-300 to-rose-500"
  },
  drama: {
    label: "드라마",
    scenario: "오랜 친구들의 단체방에 10년 전 사진이 올라왔다. 사진 뒷면에는 지워진 이름이 있다.",
    initialGoal: "사진을 올린 사람과 지워진 이름을 밝혀라.",
    secret: "당신은 그 사진을 예전에 본 적이 있다.",
    accent: "from-violet-300 to-fuchsia-500"
  }
};

const PLAYER_COLORS = ["#60a5fa", "#34d399", "#a78bfa", "#fb923c", "#f472b6", "#facc15"];

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

export function makePlayers(humanCount: number, aiPersonas: Player["persona"][]): Player[] {
  const humans = Array.from({ length: humanCount }, (_, index) => ({
    id: uid("human"),
    name: humanCount === 1 ? "나" : `플레이어 ${index + 1}`,
    kind: "human" as const,
    color: PLAYER_COLORS[index % PLAYER_COLORS.length]
  }));

  const ais = aiPersonas.map((persona, index) => ({
    id: uid("ai"),
    name: persona?.name || `AI 분신 ${index + 1}`,
    kind: "ai" as const,
    persona,
    color: PLAYER_COLORS[(humans.length + index) % PLAYER_COLORS.length]
  }));

  return [...humans, ...ais];
}

export function createInitialActionHints(mode: GameMode): ActionHint[] {
  const labels: Record<GameMode, string[]> = {
    deduction: ["편지를 조사한다", "다른 사람을 추궁한다", "창고를 확인한다", "모두 함께 회의한다"],
    survival: ["산소 밸브를 확인한다", "비상 창고를 조사한다", "정비 로그를 추적한다", "역할을 나눠 움직인다"],
    politics: ["칙서를 조사한다", "후보를 설득한다", "경비병에게 묻는다", "동맹을 제안한다"],
    romance: ["편지를 조사한다", "목격자를 찾는다", "상대의 반응을 떠본다", "단체 대화를 유도한다"],
    drama: ["사진을 조사한다", "옛 기억을 묻는다", "누가 올렸는지 추궁한다", "친구들을 진정시킨다"]
  };

  return [...labels[mode], "자유롭게 행동한다"].map((label, index) => ({
    id: index + 1,
    label,
    naturalMessage: index === 4 ? "난 일단 내 방식대로 움직여볼게." : `난 ${label.replace("한다", "할게")}.`
  }));
}

export function createInitialPlayerStates(players: Player[]): PlayerState[] {
  return players.map((player, index) => ({
    playerId: player.id,
    trust: Math.max(35, 62 - index * 3),
    suspicion: Math.min(70, 25 + index * 5),
    affection: Math.max(30, 55 - index * 2)
  }));
}

export function createGameSession(params: {
  mode: GameMode;
  humanCount: number;
  aiPersonas: NonNullable<Player["persona"]>[];
  maxTurns?: number;
}): GameSession {
  const players = makePlayers(params.humanCount, params.aiPersonas);
  const mode = GAME_MODES[params.mode];
  const caseBriefing = createCaseBriefing(params.mode);
  const playerRoles = createPlayerRoles(params.mode, players, mode.secret);
  const firstHuman = players.find((player) => player.kind === "human");
  const humanRole = playerRoles.find((role) => role.playerId === firstHuman?.id);

  return {
    id: uid("game"),
    mode: params.mode,
    totalPlayers: players.length,
    humanCount: params.humanCount,
    aiCount: params.aiPersonas.length,
    players,
    playerRoles,
    currentTurn: 1,
    maxTurns: params.maxTurns || 8,
    hasEnteredChat: false,
    caseBriefing,
    situation: mode.scenario,
    discoveredClues: [],
    worldState: createInitialWorldState(params.mode),
    timeline: [],
    turnGoal: caseBriefing.goal || mode.initialGoal,
    mySecret: humanRole?.secret || mode.secret,
    actionHints: createInitialActionHints(params.mode),
    playerStates: createInitialPlayerStates(players),
    chatLog: [],
    turnHistory: [],
    status: "briefing",
    createdAt: new Date().toISOString(),
    spokenLineHistory: [],
    usedSpeechActs: {}
  };
}

export function createChatMessage(input: {
  turn: number;
  player: Player;
  content: string;
}): ChatMessage {
  return {
    id: uid("msg"),
    turn: input.turn,
    playerId: input.player.id,
    playerName: input.player.name,
    isAi: input.player.kind === "ai",
    type: input.player.kind === "ai" ? "ai" : "user",
    content: input.content.trim(),
    revealedAt: new Date().toISOString()
  };
}

export function createSystemChatMessages(turn: number, update: GameMasterUpdate): ChatMessage[] {
  const change = update.newEvidence
    ? `새로운 단서가 공개됐다. ${update.newEvidence.name}`
    : (update.eventChange || update.storyProgress.lines.find(Boolean) || update.noticeBody).trim();
  const contents = [change].filter((line) => line && line.length > 0);

  return contents.map((content, index) => ({
    id: uid(`system-${turn}-${index}`),
    turn,
    playerId: "system",
    playerName: "시스템",
    isAi: false,
    type: "system",
    content: content.slice(0, 180),
    revealedAt: new Date().toISOString()
  }));
}

export function normalizeHumanTurnInput(content: string, actionHints: ActionHint[]) {
  const trimmed = content.trim();
  const number = Number(trimmed);
  const hint = actionHints.find((item) => item.id === number);
  return hint ? hint.naturalMessage : trimmed;
}

export function saveSession(session: GameSession) {
  if (typeof window !== "undefined") {
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(session));
  }
}

function normalizeDangerLevel(value: unknown): GameSession["worldState"]["dangerLevel"] {
  if (value === "안정" || value === "주의" || value === "위험" || value === "위기") return value;
  return "주의";
}

export function loadSession(): GameSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(GAME_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GameSession;
    const caseBriefing = parsed.caseBriefing || createCaseBriefing(parsed.mode);
    const players = (parsed.players || []).map((player) => ({
      ...player,
      persona: player.persona ? { ...player.persona, isMyPersona: Boolean(player.persona.isMyPersona) } : undefined
    }));
    const playerRoles = parsed.playerRoles?.length ? parsed.playerRoles : createPlayerRoles(parsed.mode, players, GAME_MODES[parsed.mode].secret);
    const migratedClues = (parsed.discoveredClues || []).map((clue, index) =>
      typeof clue === "string"
        ? {
            id: `legacy-clue-${index}`,
            name: clue,
            foundAt: "이전 기록",
            appearance: `${clue} 단서가 발견된 기록이다.`,
            condition: "상세 정보가 없는 이전 버전 단서다.",
            damage: "훼손 흔적은 기록되지 않았다.",
            content: clue,
            reasoningPoints: ["이 단서가 누구의 발언과 연결되는지 확인한다."],
            discoveredTurn: index + 1,
            visibility: "public" as const
          }
        : clue
    );
    const worldState = parsed.worldState || createInitialWorldState(parsed.mode);
    const firstHuman = players.find((player) => player.kind === "human");
    const humanRole = playerRoles.find((role) => role.playerId === firstHuman?.id);

    return {
      ...parsed,
      players,
      playerRoles,
      maxTurns: parsed.maxTurns || 8,
      hasEnteredChat: parsed.hasEnteredChat ?? (parsed.turnHistory?.length || 0) > 0,
      caseBriefing,
      turnGoal: parsed.turnGoal || caseBriefing.goal,
      mySecret: humanRole?.secret || parsed.mySecret || GAME_MODES[parsed.mode].secret,
      discoveredClues: migratedClues,
      worldState: { ...worldState, dangerLevel: normalizeDangerLevel(worldState.dangerLevel) },
      timeline: parsed.timeline || [],
      actionHints: parsed.actionHints || createInitialActionHints(parsed.mode),
      playerStates: parsed.playerStates || createInitialPlayerStates(players),
      endingJudgement: parsed.endingJudgement,
      spokenLineHistory: parsed.spokenLineHistory || [],
      usedSpeechActs: parsed.usedSpeechActs || {}
    };
  } catch {
    return null;
  }
}

export function hasUserPersona(session: GameSession): boolean {
  return getPersonaMatchPlayers(session).length > 0;
}

function getPersonaMatchPlayers(session: GameSession) {
  const explicitMyPersonas = session.players.filter((player) => player.kind === "ai" && player.persona?.isMyPersona === true);
  if (explicitMyPersonas.length > 0) return explicitMyPersonas;

  const isSoloPersonaGame =
    session.humanCount === 1 &&
    session.players.filter((p) => p.kind === "ai" && Boolean(p.persona)).length === 1 &&
    session.players.length === 2;
  if (isSoloPersonaGame) {
    return session.players.filter((player) => player.kind === "ai" && Boolean(player.persona));
  }
  return [];
}

export function calculatePersonaMatch(session: GameSession): number {
  const humanText = session.chatLog
    .filter((message) => message.type !== "system" && !message.isAi)
    .map((message) => message.content)
    .join(" ");
  const personaText = session.players
    .filter((player) => getPersonaMatchPlayers(session).some((target) => target.id === player.id))
    .flatMap((player) => [
      player.persona?.speechStyle,
      player.persona?.personality,
      player.persona?.decisionStyle,
      ...(player.persona?.behaviorRules || []),
      ...(player.persona?.catchphrases || [])
    ])
    .filter(Boolean)
    .join(" ");

  const keywords = personaText
    .replace(/[^\w가-힣\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 2);

  const matches = keywords.filter((word) => humanText.includes(word)).length;
  const base = 64 + Math.min(23, matches * 3);
  return Math.min(96, base + (session.turnHistory.length % 5));
}

function getPlayStyleTitle(session: GameSession) {
  const humanMessages = session.chatLog.filter((message) => message.type !== "system" && !message.isAi);
  const joined = humanMessages.map((message) => message.content).join(" ");
  if (humanMessages.length <= 2) return "프로 눈팅러";
  if (/증거|확인|로그|CCTV|단서/.test(joined)) return "팩트 폭격기";
  if (/의심|수상|범인|거짓/.test(joined)) return "압박형 추리러";
  if (/함께|공유|믿|도와/.test(joined)) return "팀플 중재자";
  return "독고다이 선동가";
}

export function buildResultReport(session: GameSession): ResultReport {
  const modeLabel = GAME_MODES[session.mode].label;
  const endingJudgement = session.endingJudgement || judgeEnding(session);
  const playStyleTitle = getPlayStyleTitle(session);
  const includePersonaMatch = hasUserPersona(session);
  const match = includePersonaMatch ? calculatePersonaMatch(session) : undefined;

  return {
    summary: `${modeLabel} 모드가 종료되었습니다. 이번 결말은 플레이어의 발언, 발견한 단서, 세계 상태 변화가 함께 만든 결과입니다.`,
    playerChoices: session.players.map((player) => {
      const ownMessages = session.chatLog.filter((message) => message.playerId === player.id);
      const lastMessage = ownMessages.at(-1)?.content || "결정적인 발언은 남기지 않았다.";
      const role = session.playerRoles.find((item) => item.playerId === player.id);
      return {
        playerName: player.name,
        summary: `${role?.roleName || "참가자"}로 ${ownMessages.length}회 발언. 마지막 발언: "${lastMessage}"`
      };
    }),
    playStyleTitle,
    endingJudgement,
    personaMatchPercent: match,
    aiReport:
      match === undefined
        ? undefined
        : match >= 82
          ? "AI 분석기는 사용자의 말투와 선택이 생성된 AI 분신의 성향과 꽤 가깝다고 봅니다. 협력과 의심 사이의 균형이 비슷했습니다."
          : "AI 분석기는 말투 일부는 닮았지만 실제 플레이 선택에는 다른 흐름이 있었다고 봅니다. 다음 판에서는 더 많은 대화 데이터가 도움이 됩니다."
  };
}
