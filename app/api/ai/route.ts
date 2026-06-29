import { NextResponse } from "next/server";
import { createFallbackTurnMessages, mockGameMasterUpdate, type AiTurnMessagesInput } from "@/lib/ai";
import { createInitialActionHints } from "@/lib/gameEngine";
import { callOpenRouterChat } from "@/lib/openrouter";
import { createMockPersona, normalizePersonaInput } from "@/lib/persona";
import { isSimilarSpeech, normalizeSpeech } from "@/lib/personaSpeech";
import type { GameMasterUpdate, GameMode, PersonaProfile, PersonaSource, Player } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function parseJson<T>(text: string | null | undefined): T | null {
  if (!text) return null;
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

function sanitizePersona(parsed: Partial<PersonaProfile> | null, fallback: PersonaProfile): PersonaProfile {
  if (!parsed) return fallback;
  return {
    ...fallback,
    name: parsed.name || fallback.name,
    summary: parsed.summary || fallback.summary,
    isMyPersona: typeof parsed.isMyPersona === "boolean" ? parsed.isMyPersona : fallback.isMyPersona,
    speechStyle: parsed.speechStyle || fallback.speechStyle,
    personality: parsed.personality || fallback.personality,
    behaviorRules: Array.isArray(parsed.behaviorRules) && parsed.behaviorRules.length > 0 ? parsed.behaviorRules.slice(0, 8) : fallback.behaviorRules,
    decisionStyle: parsed.decisionStyle || fallback.decisionStyle,
    cooperation: typeof parsed.cooperation === "number" ? parsed.cooperation : fallback.cooperation,
    betrayal: typeof parsed.betrayal === "number" ? parsed.betrayal : fallback.betrayal,
    catchphrases: Array.isArray(parsed.catchphrases) ? parsed.catchphrases.slice(0, 8) : fallback.catchphrases,
    conversationStyle: parsed.conversationStyle || fallback.conversationStyle,
    systemPrompt: parsed.systemPrompt || fallback.systemPrompt
  };
}

function sanitizeGameMaster(parsed: Partial<GameMasterUpdate> | null, fallback: GameMasterUpdate, mode: GameMode): GameMasterUpdate {
  if (!parsed) return fallback;
  return {
    noticeTitle: parsed.noticeTitle || fallback.noticeTitle,
    noticeBody: parsed.noticeBody || fallback.noticeBody,
    publicNotice: parsed.publicNotice || fallback.publicNotice,
    actionResult: parsed.actionResult || fallback.actionResult,
    storyProgress: parsed.storyProgress || fallback.storyProgress,
    newClue: parsed.newClue || fallback.newClue,
    newEvidence: parsed.newEvidence || fallback.newEvidence,
    eventChange: parsed.newEvidence ? undefined : parsed.eventChange || fallback.eventChange,
    nextSituation: parsed.nextSituation || fallback.nextSituation,
    worldState: parsed.worldState || fallback.worldState,
    timelineEvent: parsed.timelineEvent || fallback.timelineEvent,
    turnGoal: parsed.turnGoal || fallback.turnGoal,
    actionHints: Array.isArray(parsed.actionHints) && parsed.actionHints.length === 5 ? parsed.actionHints : createInitialActionHints(mode),
    playerStates: Array.isArray(parsed.playerStates) && parsed.playerStates.length > 0 ? parsed.playerStates : fallback.playerStates
  };
}

const FORBIDDEN_SPEECH = /핵심은|논리적으로 보면|단서를? 정리|이번 턴|상황을 보면|정리해보자|분석해|판단됩니다|제가 보기에는|시간대부터 맞추|(?:나는|내가) (?:범인|목격자|연인|배신자|공범)|내 (?:역할|승리 조건|목표)은/;

function buildPersonaContexts(input: AiTurnMessagesInput) {
  const recentConversation = input.chatLog.slice(-10);
  return input.aiPlayers.map((player) => {
    const role = input.playerRoles?.find((item) => item.playerId === player.id);
    const state = input.playerStates.find((item) => item.playerId === player.id);
    return {
      playerId: player.id,
      name: player.name,
      profilePriority: {
        speechStyle: player.persona?.speechStyle,
        conversationStyle: player.persona?.conversationStyle,
        personality: player.persona?.personality,
        catchphrases: player.persona?.catchphrases,
        behaviorRules: player.persona?.behaviorRules,
        personaInstructions: player.persona?.systemPrompt
      },
      recentOwnLines: (input.spokenLineHistory || []).filter((line) => line.playerId === player.id).slice(-6).map((line) => line.original),
      role: role?.roleName,
      hiddenGoal: role?.victoryGoal,
      hiddenSecret: role?.secret,
      relationship: role?.relationship,
      trust: state?.trust,
      suspicion: state?.suspicion,
      recentConversation
    };
  });
}

function sanitizeTurnResult(parsed: Record<string, unknown> | null, fallback: ReturnType<typeof createFallbackTurnMessages>, input: AiTurnMessagesInput) {
  const messages: Record<string, string> = {};
  input.aiPlayers.forEach((player: Player) => {
    const raw = typeof parsed?.[player.id] === "string" ? String(parsed[player.id]).replace(/\s+/g, " ").trim() : "";
    const candidate = raw.split(/(?<=[.!?。])\s+/).filter(Boolean).slice(0, 2).join(" ").slice(0, 180);
    const previous = (input.spokenLineHistory || []).filter((line) => line.playerId === player.id).slice(-8).map((line) => line.original);
    messages[player.id] = !candidate || FORBIDDEN_SPEECH.test(candidate) || isSimilarSpeech(candidate, previous)
      ? fallback.messages[player.id]
      : candidate;
  });

  return {
    messages,
    newSpokenLines: fallback.newSpokenLines.map((line) => ({
      ...line,
      original: messages[line.playerId],
      normalized: normalizeSpeech(messages[line.playerId])
    })),
    newUsedSpeechActs: fallback.newUsedSpeechActs
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action as "persona" | "turnMessages" | "gameMaster";
    const payload = body.payload;

    if (action === "persona") {
      const input = payload as { source: PersonaSource; rawText: string; index?: number; preferredName?: string };
      const analysisText = normalizePersonaInput(input.source, input.rawText);
      const fallback = createMockPersona({ ...input, rawText: analysisText });
      const content = await callOpenRouterChat([
        {
          role: "system",
          content: [
            "너는 실제 사람의 카카오톡 말투를 복제하는 대화 습관 분석기다.",
            "게임 캐릭터를 창작하지 말고 입력에서 확인되는 문장 길이, 반말/존댓말, 질문 빈도, 웃음, 이모티콘, 리듬과 반응 습관을 추출한다.",
            "catchphrases에는 실제 입력에 있는 표현만 넣는다.",
            "반드시 PersonaProfile JSON만 반환한다."
          ].join("\n")
        },
        { role: "user", content: analysisText }
      ]);
      return NextResponse.json(sanitizePersona(parseJson<Partial<PersonaProfile>>(content), fallback));
    }

    if (action === "turnMessages") {
      const input = payload as AiTurnMessagesInput;
      const fallback = createFallbackTurnMessages(input);
      const content = await callOpenRouterChat([
        {
          role: "system",
          content: [
            "너는 실제 사람의 카카오톡 말투를 복제한 AI 분신이다.",
            "우선순위는 1) profilePriority 2) 최근 대화 3) 게임 모드의 감정 4) 역할 5) 숨은 목표다.",
            "역할과 목표는 행동 동기로만 사용하고 절대 설명하거나 자백하지 않는다.",
            "게임 설명, 상황 요약, 분석, 진행자 말투를 금지한다.",
            "'핵심은', '논리적으로 보면', '단서를 정리', '이번 턴', '상황을 보면', '시간대부터 맞추자'를 쓰지 않는다.",
            "각 분신은 마지막 사람 발언에 자기 말투로 바로 반응하고, 최근 자기 발화와 같은 구조를 반복하지 않는다.",
            "실제 단체 카카오톡처럼 1~2문장만 쓴다.",
            "반드시 {\"playerId\":\"채팅 문장\"} JSON 객체만 반환한다."
          ].join("\n")
        },
        {
          role: "user",
          content: JSON.stringify({
            mode: input.mode,
            situation: input.situation,
            lastHumanMessage: input.chatLog.filter((message) => message.type !== "system" && !message.isAi).at(-1),
            recentConversation: input.chatLog.slice(-10),
            personas: buildPersonaContexts(input)
          })
        }
      ]);
      return NextResponse.json(sanitizeTurnResult(parseJson<Record<string, unknown>>(content), fallback, input));
    }

    if (action === "gameMaster") {
      const input = payload as Parameters<typeof mockGameMasterUpdate>[0];
      const fallback = mockGameMasterUpdate(input);
      const content = await callOpenRouterChat([
        {
          role: "system",
          content: [
            "너는 소셜 게임의 내부 판정 엔진이다.",
            "플레이어가 하지 않은 행동을 만들지 않는다.",
            "조사 행동이 없으면 새 단서를 만들지 않는다.",
            "화면에는 system 메시지로 표시되므로 해설이나 교훈 없이 실제로 일어난 변화만 짧게 쓴다.",
            "반드시 GameMasterUpdate JSON만 반환한다."
          ].join("\n")
        },
        { role: "user", content: JSON.stringify(input) }
      ]);
      return NextResponse.json(sanitizeGameMaster(parseJson<Partial<GameMasterUpdate>>(content), fallback, input.mode));
    }

    return NextResponse.json({ error: "Unknown AI action" }, { status: 400 });
  } catch (error) {
    console.error("AI API 오류:", error);
    return NextResponse.json({ error: "AI 응답 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
