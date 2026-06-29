"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CaseBriefing from "@/components/CaseBriefing";
import ChatRoom from "@/components/ChatRoom";
import InvestigationPanel from "@/components/InvestigationPanel";
import TurnInput from "@/components/TurnInput";
import { generateAiTurnMessages, generateGameMasterUpdate } from "@/lib/ai";
import { createChatMessage, createSystemChatMessages, loadSession, normalizeHumanTurnInput, saveSession } from "@/lib/gameEngine";
import { judgeEnding } from "@/lib/gameRules";
import type { GameMasterUpdate, GameSession, SpokenLine } from "@/lib/types";

export default function GamePage() {
  const router = useRouter();
  const [session, setSession] = useState<GameSession | null>(null);
  const [pendingHumanMessages, setPendingHumanMessages] = useState<Record<string, string>>({});
  const [lastMasterUpdate, setLastMasterUpdate] = useState<GameMasterUpdate | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    const loaded = loadSession();
    if (!loaded) {
      router.push("/");
      return;
    }
    setSession(loaded);
    setLastMasterUpdate(loaded.turnHistory.at(-1)?.masterUpdate || null);
  }, [router]);

  const humans = useMemo(() => session?.players.filter((player) => player.kind === "human") || [], [session]);
  const aiPlayers = useMemo(() => session?.players.filter((player) => player.kind === "ai") || [], [session]);

  function enterChat() {
    if (!session) return;
    const nextSession: GameSession = { ...session, hasEnteredChat: true, status: "playing" };
    saveSession(nextSession);
    setSession(nextSession);
  }

  async function submitTurn(messages: Record<string, string>) {
    if (!session || isResolving) return false;
    setIsResolving(true);
    
    console.log(`[Game] 턴 ${session.currentTurn} 시작`);
    const turnStartTime = Date.now();

    try {
      const normalizedHumanMessages = Object.fromEntries(
        Object.entries(messages).map(([playerId, content]) => [playerId, normalizeHumanTurnInput(content, session.actionHints)])
      );
      setPendingHumanMessages(normalizedHumanMessages);

      const humanTurnMessages = humans.map((player) =>
        createChatMessage({ turn: session.currentTurn, player, content: normalizedHumanMessages[player.id] || "..." })
      );

      // AI 응답 생성 (실패해도 계속 진행 + 중복 방지)
      let aiMessages: Record<string, string> = {};
      let newSpokenLines: SpokenLine[] = [];
      let newUsedSpeechActs: Record<string, string[]> = {};
      try {
        console.log(`[Game] AI 응답 생성 시작`);
        const result = await generateAiTurnMessages({
          aiPlayers,
          mode: session.mode,
          situation: session.situation,
          caseBriefing: session.caseBriefing,
          discoveredClues: session.discoveredClues,
          turnGoal: session.turnGoal,
          mySecret: session.mySecret,
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
        aiMessages = result.messages;
        newSpokenLines = result.newSpokenLines;
        newUsedSpeechActs = result.newUsedSpeechActs;
        console.log(`[Game] AI 응답 생성 완료 (중복 방지 적용)`);
      } catch (aiError) {
        console.error("[Game] AI 응답 생성 실패, fallback 사용:", aiError);
        // 실패 시 기본 메시지로 대체
        aiPlayers.forEach((player) => {
          aiMessages[player.id] = "...";
        });
      }

      const revealedMessages = [
        ...humanTurnMessages,
        ...aiPlayers.map((player) =>
          createChatMessage({
            turn: session.currentTurn,
            player,
            content: aiMessages[player.id] || "잠깐, 이건 좀 이상한데."
          })
        )
      ];

      // GM 업데이트 (실패해도 계속 진행)
      let masterUpdate: GameMasterUpdate;
      try {
        console.log(`[Game] GM 업데이트 시작`);
        masterUpdate = await generateGameMasterUpdate({
          mode: session.mode,
          turn: session.currentTurn,
          messages: revealedMessages,
          situation: session.situation,
          discoveredClues: session.discoveredClues,
          playerStates: session.playerStates,
          playerRoles: session.playerRoles,
          worldState: session.worldState
        });
        console.log(`[Game] GM 업데이트 완료`);
      } catch (gmError) {
        console.error("[Game] GM 업데이트 실패, 기본값 사용:", gmError);
        // 실패 시 기본 GM 업데이트 생성
        masterUpdate = {
          noticeTitle: "GM 진행",
          noticeBody: session.situation,
          publicNotice: { title: "전체 공지", lines: [] },
          actionResult: { actor: "플레이어", action: "", lines: [], impact: "" },
          storyProgress: { title: "사건 진행", lines: [] },
          newClue: undefined,
          newEvidence: undefined,
          eventChange: undefined,
          nextSituation: session.situation,
          worldState: session.worldState,
          timelineEvent: { turn: session.currentTurn, title: "진행", detail: "" },
          turnGoal: session.turnGoal,
          actionHints: session.actionHints,
          playerStates: session.playerStates
        };
      }
      
      const systemMessages = createSystemChatMessages(session.currentTurn, masterUpdate);
      const turnMessages = [...revealedMessages, ...systemMessages];

      // 단서 처리 (undefined 체크 강화)
      const discoveredClues =
        masterUpdate.newEvidence && 
        masterUpdate.newEvidence.id && 
        masterUpdate.newEvidence.name &&
        !session.discoveredClues.some((clue) => clue.id === masterUpdate.newEvidence!.id)
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
        // 발화 기록 업데이트 (중복 방지용)
        spokenLineHistory: [...(session.spokenLineHistory || []), ...newSpokenLines],
        usedSpeechActs: { ...(session.usedSpeechActs || {}), ...newUsedSpeechActs }
      };

      saveSession(nextSession);
      setSession(nextSession);
      setLastMasterUpdate(masterUpdate);
      setPendingHumanMessages({});
      
      console.log(`[Game] 턴 ${session.currentTurn} 완료 (${Date.now() - turnStartTime}ms)`);
    } catch (error) {
      console.error("[Game] 턴 처리 중 오류:", error);
    } finally {
      setIsResolving(false);
    }

    if (session.currentTurn >= session.maxTurns) {
      setTimeout(() => router.push("/result"), 900);
    }
    return true;
  }

  if (!session) {
    return <main className="flex min-h-screen items-center justify-center bg-ink text-slate-200">게임 세션을 불러오는 중...</main>;
  }

  if (!session.hasEnteredChat) {
    return <CaseBriefing session={session} onEnter={enterChat} />;
  }

  return (
    <main className="h-screen overflow-hidden bg-ink text-white">
      <div className="grid h-screen w-full lg:grid-cols-[72%_28%]">
        <section className="flex h-screen flex-col overflow-hidden bg-[#0d111b]">
          <ChatRoom session={session} isResolving={isResolving} pendingHumanMessages={pendingHumanMessages} />
          <TurnInput
            humans={humans}
            turn={session.currentTurn}
            actionHints={session.actionHints}
            disabled={isResolving || session.status === "ended"}
            onSubmit={submitTurn}
          />
        </section>
        <InvestigationPanel session={session} lastMasterUpdate={lastMasterUpdate} />
      </div>
    </main>
  );
}
