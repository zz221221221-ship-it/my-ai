"use client";

export default function PlayerSetup({
  humanCount,
  aiCount,
  personaCount,
  maxTurns,
  onChange,
  onTurnChange
}: {
  humanCount: number;
  aiCount: number;
  personaCount: number;
  maxTurns: number;
  onChange: (value: { humanCount: number; aiCount: number }) => void;
  onTurnChange: (turns: number) => void;
}) {
  function updateHumans(nextHuman: number) {
    const clampedHuman = Math.max(1, Math.min(6, nextHuman));
    const nextAi = Math.max(0, Math.min(6 - clampedHuman, aiCount));
    onChange({ humanCount: clampedHuman, aiCount: nextAi });
  }

  function updateAi(nextAi: number) {
    const clampedAi = Math.max(0, Math.min(6 - humanCount, nextAi));
    onChange({ humanCount, aiCount: clampedAi });
  }

  return (
    <section className="rounded-[8px] border border-line bg-panel p-5">
      <h2 className="text-lg font-black">참가자 설정</h2>
      <div className="mt-4 space-y-5">
        <label className="block">
          <span className="flex justify-between text-sm text-slate-300">
            실제 사람 수 <b className="text-white">{humanCount}명</b>
          </span>
          <input className="mt-3 w-full accent-kakao" type="range" min={1} max={6} value={humanCount} onChange={(event) => updateHumans(Number(event.target.value))} />
        </label>
        <label className="block">
          <span className="flex justify-between text-sm text-slate-300">
            AI 분신 수 <b className="text-white">{aiCount}명</b>
          </span>
          <input className="mt-3 w-full accent-kakao" type="range" min={0} max={6 - humanCount} value={aiCount} onChange={(event) => updateAi(Number(event.target.value))} />
        </label>

        <div>
          <p className="mb-2 text-sm font-bold text-slate-300">게임 길이</p>
          <div className="grid grid-cols-3 gap-2 text-sm">
            {[
              { label: "짧게", turns: 5 },
              { label: "보통", turns: 8 },
              { label: "길게", turns: 12 }
            ].map((option) => (
              <button
                key={option.turns}
                type="button"
                onClick={() => onTurnChange(option.turns)}
                className={`rounded-[8px] border px-3 py-2 font-bold transition hover:scale-[1.02] ${
                  maxTurns === option.turns ? "border-kakao bg-kakao text-black" : "border-line bg-black/20 text-slate-300"
                }`}
              >
                {option.label}
                <span className="block text-xs opacity-70">{option.turns}턴</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[8px] border border-line bg-black/20 p-3 text-sm text-slate-300">
          총 {humanCount + aiCount}명 / 생성된 AI 분신 {personaCount}명 / {maxTurns}턴
        </div>
      </div>
    </section>
  );
}
