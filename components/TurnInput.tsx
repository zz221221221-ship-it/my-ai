"use client";

import { useEffect, useRef, useState } from "react";
import type { ActionHint, Player } from "@/lib/types";

export default function TurnInput({
  humans,
  turn,
  actionHints,
  disabled,
  onSubmit
}: {
  humans: Player[];
  turn: number;
  actionHints: ActionHint[];
  disabled: boolean;
  onSubmit: (messages: Record<string, string>) => Promise<boolean>;
}) {
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [activeHumanId, setActiveHumanId] = useState<string | null>(humans[0]?.id || null);
  const [showHints, setShowHints] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const previousTurnRef = useRef(turn);
  const firstHumanId = humans[0]?.id || null;

  useEffect(() => {
    setActiveHumanId(firstHumanId);
  }, [firstHumanId]);

  useEffect(() => {
    const previousTurn = previousTurnRef.current;
    if (previousTurn === turn) return;

    if (process.env.NODE_ENV !== "production") {
      console.log("[TurnInput] confirmed turn change; clearing submitted draft", {
        previousTurn,
        nextTurn: turn
      });
    }

    previousTurnRef.current = turn;
    setMessages({});
    setShowHints(false);
    setActiveHumanId(firstHumanId);
    window.setTimeout(() => {
      if (firstHumanId) inputRefs.current[firstHumanId]?.focus();
    }, 0);
  }, [turn, firstHumanId]);

  const ready = humans.every((player) => messages[player.id]?.trim());
  const targetHumanId = activeHumanId || humans[0]?.id;

  function fillHint(hint: ActionHint) {
    if (!targetHumanId) return;
    setMessages((prev) => ({ ...prev, [targetHumanId]: hint.naturalMessage }));
    setShowHints(false);
    window.setTimeout(() => inputRefs.current[targetHumanId]?.focus(), 0);
  }

  async function submit() {
    if (!ready || disabled || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const submitted = await onSubmit(messages);
      if (!submitted) return;
      setMessages({});
      setShowHints(false);
      window.setTimeout(() => {
        if (targetHumanId) inputRefs.current[targetHumanId]?.focus();
      }, 0);
    } catch {
      // 전송 실패 시 사용자가 작성한 draft를 그대로 보존한다.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <footer className="border-t border-line bg-panel/95 p-4">
      <div className="mx-auto max-w-5xl space-y-3">
        {showHints && (
          <section className="rounded-[8px] border border-line bg-black/30 p-3">
            <p className="text-sm font-black text-kakao">💡 행동 추천</p>
            <div className="mt-2 grid gap-2 text-sm text-slate-300 md:grid-cols-5">
              {actionHints.map((hint) => (
                <button
                  key={hint.id}
                  type="button"
                  onClick={() => fillHint(hint)}
                  className="rounded-md bg-white/[0.04] px-3 py-2 text-left transition hover:scale-[1.02] hover:bg-kakao/10 hover:text-kakao"
                >
                  {hint.label}
                </button>
              ))}
            </div>
          </section>
        )}

        {humans.map((player) => (
          <label key={player.id} className="block">
            <span className="mb-2 block text-sm font-bold text-slate-200">{player.name}의 {turn}턴 메시지</span>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => setShowHints((value) => !value)}
                className="mb-1 shrink-0 rounded-[8px] border border-line bg-black/30 px-3 py-3 text-sm font-black text-kakao transition hover:scale-[1.02] hover:border-kakao/50"
              >
                💡 행동 추천
              </button>
              <textarea
                ref={(element) => {
                  inputRefs.current[player.id] = element;
                }}
                value={messages[player.id] || ""}
                onFocus={() => setActiveHumanId(player.id)}
                onChange={(event) => setMessages((prev) => ({ ...prev, [player.id]: event.target.value }))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submit();
                  }
                }}
                disabled={disabled || isSubmitting}
                placeholder="메시지를 입력하세요."
                className="min-h-16 flex-1 resize-none rounded-[8px] border border-line bg-black/30 px-4 py-3 text-sm leading-6 outline-none focus:border-kakao disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => void submit()}
                disabled={!ready || disabled || isSubmitting}
                className="mb-1 shrink-0 rounded-[8px] bg-kakao px-5 py-3 text-sm font-black text-black transition hover:scale-[1.02] hover:brightness-95 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                전송
              </button>
            </div>
          </label>
        ))}
        <p className="text-xs text-slate-500">Enter 전송, Shift + Enter 줄바꿈</p>
      </div>
    </footer>
  );
}
