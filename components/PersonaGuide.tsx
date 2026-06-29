"use client";

import { useState } from "react";
import { PERSONA_ANALYSIS_PROMPT } from "@/lib/prompts/personaPrompt";

export default function PersonaGuide() {
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    await navigator.clipboard.writeText(PERSONA_ANALYSIS_PROMPT);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="rounded-[8px] border border-kakao/30 bg-kakao/10 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-kakao">AI 분신 생성 방법</p>
          <h2 className="mt-2 text-xl font-black">더 닮은 분신을 만드는 2가지 방법</h2>
        </div>
        <button
          onClick={copyPrompt}
          className="rounded-[8px] bg-kakao px-4 py-2 text-sm font-black text-black transition hover:brightness-95"
        >
          {copied ? "복사 완료" : "프롬프트 복사"}
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <article className="rounded-[8px] border border-kakao/30 bg-black/20 p-4">
          <div className="text-sm font-black text-kakao">① ChatGPT / Gemini 분석 결과 붙여넣기</div>
          <p className="mt-3 text-sm leading-6 text-slate-200">
            프롬프트를 복사해 ChatGPT 또는 Gemini에 붙여넣고, 생성된 AI 분신 프로필 결과를 다시 게임 입력창에 붙여넣으세요.
          </p>
        </article>
        <article className="rounded-[8px] border border-line bg-black/20 p-4">
          <div className="text-sm font-black text-slate-100">② 카카오톡 대화 txt 업로드</div>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            카카오톡 txt를 올리면 닉네임, 시간, 날짜, 입장/퇴장 같은 시스템 메시지를 제거하고 실제 대화 내용만 분석합니다.
          </p>
        </article>
      </div>
    </section>
  );
}
