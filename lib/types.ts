export type GameMode = "deduction" | "survival" | "politics" | "romance" | "drama";

export type PersonaSource = "prompt" | "kakao";

export interface ConversationStyleProfile {
  messageLength: "very-short" | "short" | "medium";
  formality: "casual" | "polite" | "mixed";
  questionFrequency: "low" | "medium" | "high";
  laughterStyle: string;
  emojiStyle: string;
  responsePattern: string;
  initiative: "passive" | "balanced" | "active";
}

export interface PersonaProfile {
  id: string;
  name: string;
  source: PersonaSource;
  isMyPersona: boolean;
  summary: string;
  speechStyle: string;
  personality: string;
  behaviorRules: string[];
  decisionStyle: string;
  cooperation: number;
  betrayal: number;
  catchphrases: string[];
  conversationStyle?: ConversationStyleProfile;
  systemPrompt: string;
}

export interface Player {
  id: string;
  name: string;
  kind: "human" | "ai";
  persona?: PersonaProfile;
  color: string;
}

export interface PlayerState {
  playerId: string;
  trust: number;
  suspicion: number;
  affection: number;
}

export interface ActionHint {
  id: number;
  label: string;
  naturalMessage: string;
}

export interface CaseBriefing {
  title: string;
  background: string;
  location: string;
  mainIncident: string;
  goal: string;
  rules: string[];
  firstQuestion: string;
  memoLines: string[];
}

export interface EvidenceClue {
  id: string;
  name: string;
  foundAt: string;
  appearance: string;
  condition: string;
  damage: string;
  content: string;
  reasoningPoints: string[];
  discoveredTurn: number;
  visibility?: "public" | "private";
  ownerPlayerId?: string;
}

export interface WorldState {
  currentTime: string;
  remainingTime: string;
  dangerLevel: "안정" | "주의" | "위험" | "위기";
  mainLocation: string;
  metrics: Array<{
    label: string;
    value: string;
  }>;
  environment: string;
}

export interface PublicNotice {
  title: string;
  lines: string[];
}

export interface ActionResult {
  actor: string;
  action: string;
  lines: string[];
  impact: string;
}

export interface StoryProgress {
  title: string;
  lines: string[];
}

export interface TimelineEvent {
  turn: number;
  title: string;
  detail: string;
}

export type RoleType =
  | "detective"
  | "civilian"
  | "culprit"
  | "accomplice"
  | "secretCrush"
  | "secretLover"
  | "rival"
  | "helper"
  | "engineer"
  | "doctor"
  | "leader"
  | "survivor"
  | "heir"
  | "broker"
  | "guard"
  | "reformer"
  | "witness"
  | "keeper"
  | "mediator"
  | "outsider";

export interface PlayerRole {
  playerId: string;
  roleName: string;
  roleType: RoleType;
  victoryGoal: string;
  defeatCondition: string;
  secret: string;
  relationship: string;
  actionScope: string[];
}

export interface EndingJudgement {
  winnerSide: string;
  outcomeTitle: string;
  isPlayerVictory: boolean;
  reason: string;
}

export interface ChatMessage {
  id: string;
  turn: number;
  playerId: string;
  playerName: string;
  isAi: boolean;
  type?: "user" | "ai" | "system";
  content: string;
  revealedAt: string;
}

export interface GameMasterUpdate {
  noticeTitle: string;
  noticeBody: string;
  publicNotice: PublicNotice;
  actionResult: ActionResult;
  storyProgress: StoryProgress;
  newClue?: string;
  newEvidence?: EvidenceClue;
  eventChange?: string;
  nextSituation: string;
  worldState: WorldState;
  timelineEvent: TimelineEvent;
  turnGoal: string;
  actionHints: ActionHint[];
  playerStates: PlayerState[];
}

export interface TurnRecord {
  turn: number;
  messages: ChatMessage[];
  masterUpdate: GameMasterUpdate;
}

// AI 발화 기록 (중복 방지용)
export interface SpokenLine {
  playerId: string;
  playerName: string;
  turn: number;
  original: string;        // 원문 발화
  normalized: string;      // 정규화된 발화
  speechAct?: string;      // 발화 전략
  intent?: string;         // 발화 의도
}

export interface GameSession {
  id: string;
  mode: GameMode;
  totalPlayers: number;
  humanCount: number;
  aiCount: number;
  players: Player[];
  playerRoles: PlayerRole[];
  currentTurn: number;
  maxTurns: number;
  hasEnteredChat: boolean;
  caseBriefing: CaseBriefing;
  situation: string;
  discoveredClues: EvidenceClue[];
  worldState: WorldState;
  timeline: TimelineEvent[];
  turnGoal: string;
  mySecret: string;
  actionHints: ActionHint[];
  playerStates: PlayerState[];
  chatLog: ChatMessage[];
  turnHistory: TurnRecord[];
  endingJudgement?: EndingJudgement;
  status: "setup" | "briefing" | "playing" | "ended";
  createdAt: string;
  spokenLineHistory: SpokenLine[];  // 세션 전체 발화 기록
  usedSpeechActs: Record<string, string[]>;  // AI별 사용된 발화 전략
}

export interface ResultReport {
  summary: string;
  playerChoices: Array<{
    playerName: string;
    summary: string;
  }>;
  playStyleTitle: string;
  endingJudgement: EndingJudgement;
  personaMatchPercent?: number;
  aiReport?: string;
}
