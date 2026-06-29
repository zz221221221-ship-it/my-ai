"use client";

import { GAME_MODES } from "@/lib/gameEngine";
import type { GameMode } from "@/lib/types";

export default function GameModeSelector({ value, onChange }: { value: GameMode; onChange: (mode: GameMode) => void }) {
  return (
    <section className="rounded-[8px] border border-line bg-panel p-5">
      <h2 className="text-lg font-black">게임 모드</h2>
      <div className="mt-4 grid gap-3">
        {(Object.keys(GAME_MODES) as GameMode[]).map((mode) => {
          const item = GAME_MODES[mode];
          const selected = value === mode;
          return (
            <button
              key={mode}
              onClick={() => onChange(mode)}
              className={`rounded-[8px] border p-4 text-left transition ${
                selected ? "border-kakao bg-kakao/10" : "border-line bg-white/[0.03] hover:border-slate-500"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold">{item.label}</span>
                {selected && <span className="rounded-full bg-kakao px-2 py-0.5 text-xs font-black text-black">선택</span>}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{item.scenario}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
