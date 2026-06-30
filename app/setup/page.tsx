"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import GameModeSelector from "@/components/GameModeSelector";
import PersonaGuide from "@/components/PersonaGuide";
import PersonaInput from "@/components/PersonaInput";
import PlayerSetup from "@/components/PlayerSetup";
import { createGameSession, saveSession } from "@/lib/gameEngine";
import type { GameMode, PersonaProfile } from "@/lib/types";

export default function SetupPage() {
  const router = useRouter();
  const [personas, setPersonas] = useState<PersonaProfile[]>([]);
  const [mode, setMode] = useState<GameMode>("deduction");
  const [humanCount, setHumanCount] = useState(1);
  const [aiCount, setAiCount] = useState(1);
  const [maxTurns, setMaxTurns] = useState(8);

  const canStart = personas.length >= aiCount && humanCount + aiCount >= 2 && humanCount + aiCount <= 6;
  const selectedPersonas = useMemo(() => personas.slice(0, aiCount), [aiCount, personas]);

  function startGame() {
    if (!canStart) return;
    const session = createGameSession({ mode, humanCount, aiPersonas: selectedPersonas, maxTurns });
    saveSession(session);
    router.push("/game");
  }

  return (
    <main className="min-h-screen bg-ink text-white">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 lg:px-8">
        <header className="grid gap-5 rounded-[8px] border border-line bg-panel/70 p-6 shadow-glow md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <button type="button" onClick={() => router.push("/")} className="mb-5 text-sm font-bold text-slate-400 hover:text-white">← 랜딩페이지</button>
            <p className="text-sm font-semibold text-kakao">AI PERSONA SOCIAL DEDUCTION</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">AI 분신 단체 채팅방</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              AI 분신들과 함께 추리, 생존, 정치, 연애, 드라마 사건을 단체 채팅처럼 플레이하는 소셜 추리 프로토타입입니다.
            </p>
          </div>
          <div className="rounded-[8px] border border-kakao/30 bg-kakao/10 p-5">
            <p className="text-sm text-slate-300">현재 MVP 흐름</p>
            <ol className="mt-3 space-y-2 text-sm text-slate-100">
              <li>1. AI 분신 생성</li>
              <li>2. 모드, 인원, 턴 수 설정</li>
              <li>3. 사건 브리핑 확인</li>
              <li>4. 채팅방 입장 후 턴제 대화</li>
              <li>5. 선택한 턴 수 종료 후 리포트</li>
            </ol>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <button
            onClick={() => document.getElementById("solo-setup")?.scrollIntoView({ behavior: "smooth" })}
            className="rounded-[8px] border border-kakao bg-kakao p-5 text-left text-black transition hover:brightness-95"
          >
            <span className="text-xl font-black">혼자 플레이하기</span>
            <span className="mt-2 block text-sm font-semibold opacity-75">기존 AI 분신 게임 설정을 그대로 사용합니다.</span>
          </button>
          <button
            onClick={() => router.push("/lobby")}
            className="rounded-[8px] border border-cyan-300/40 bg-cyan-300/10 p-5 text-left text-white transition hover:border-cyan-200 hover:bg-cyan-300/15"
          >
            <span className="text-xl font-black">친구와 플레이하기</span>
            <span className="mt-2 block text-sm text-slate-300">방을 만들거나 6자리 코드로 참가합니다.</span>
          </button>
        </section>

        <div id="solo-setup" className="grid scroll-mt-6 gap-6 lg:grid-cols-[1fr_390px]">
          <div className="space-y-6">
            <PersonaGuide />
            <PersonaInput
              personas={personas}
              onAdd={(persona) => setPersonas((prev) => [...prev, persona])}
              onRemove={(id) => setPersonas((prev) => prev.filter((persona) => persona.id !== id))}
            />
          </div>
          <aside className="space-y-6">
            <GameModeSelector value={mode} onChange={setMode} />
            <PlayerSetup
              humanCount={humanCount}
              aiCount={aiCount}
              personaCount={personas.length}
              maxTurns={maxTurns}
              onTurnChange={setMaxTurns}
              onChange={(next) => {
                setHumanCount(next.humanCount);
                setAiCount(next.aiCount);
              }}
            />
            <button
              onClick={startGame}
              disabled={!canStart}
              className="w-full rounded-[8px] bg-kakao px-5 py-4 text-base font-black text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              사건 브리핑으로 이동
            </button>
            {!canStart && <p className="text-sm text-amber-200">AI 수만큼 분신을 생성하고, 총 인원을 2~6명으로 맞춰주세요.</p>}
          </aside>
        </div>
      </section>
    </main>
  );
}
