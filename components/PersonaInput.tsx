"use client";

import { useRef, useState } from "react";
import { generatePersona } from "@/lib/ai";
import { preprocessKakaoTalkText } from "@/lib/persona/kakao";
import type { PersonaProfile, PersonaSource } from "@/lib/types";

export default function PersonaInput({
  personas,
  onAdd,
  onRemove
}: {
  personas: PersonaProfile[];
  onAdd: (persona: PersonaProfile) => void;
  onRemove: (id: string) => void;
}) {
  const [source, setSource] = useState<PersonaSource>("prompt");
  const [rawText, setRawText] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [isMyPersona, setIsMyPersona] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(file?: File) {
    if (!file) return;
    const text = await file.text();
    setSource("kakao");
    setRawText(text);
  }

  async function createPersona() {
    if (!rawText.trim() || isGenerating) return;
    setIsGenerating(true);
    const preparedText = source === "kakao" ? preprocessKakaoTalkText(rawText) : rawText.trim();
    const persona = await generatePersona({
      source,
      rawText: preparedText,
      index: personas.length,
      preferredName: preferredName.trim() || undefined
    });
    onAdd({ ...persona, isMyPersona });
    setRawText("");
    setPreferredName("");
    setIsMyPersona(false);
    if (fileRef.current) fileRef.current.value = "";
    setIsGenerating(false);
  }

  return (
    <section className="rounded-[8px] border border-line bg-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">AI 분신 생성</h2>
          <p className="mt-2 text-sm text-slate-300">ChatGPT/Gemini 분석문 또는 카카오톡 txt를 넣으면 게임 캐릭터 프로필로 변환합니다.</p>
        </div>
        <div className="flex rounded-[8px] border border-line bg-black/20 p-1 text-sm">
          <button onClick={() => setSource("prompt")} className={`rounded-md px-3 py-2 ${source === "prompt" ? "bg-kakao text-black" : "text-slate-300"}`}>프롬프트</button>
          <button onClick={() => setSource("kakao")} className={`rounded-md px-3 py-2 ${source === "kakao" ? "bg-kakao text-black" : "text-slate-300"}`}>카카오톡</button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[180px_1fr]">
        <input
          value={preferredName}
          onChange={(event) => setPreferredName(event.target.value)}
          placeholder="분신 이름"
          className="rounded-[8px] border border-line bg-black/30 px-4 py-3 text-sm outline-none focus:border-kakao"
        />
        <input
          ref={fileRef}
          type="file"
          accept=".txt,text/plain"
          onChange={(event) => handleFile(event.target.files?.[0])}
          className="rounded-[8px] border border-line bg-black/30 px-4 py-2 text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-kakao file:px-3 file:py-2 file:font-bold file:text-black"
        />
      </div>

      <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-[8px] border border-line bg-black/20 px-4 py-3 text-sm">
        <span>
          <b className="text-white">이 AI는 내 분신입니다</b>
          <span className="ml-2 text-slate-400">결과 리포트의 AI 일치율 계산 대상</span>
        </span>
        <button
          type="button"
          onClick={() => setIsMyPersona((value) => !value)}
          className={`relative h-7 w-12 rounded-full transition ${isMyPersona ? "bg-kakao" : "bg-slate-700"}`}
          aria-pressed={isMyPersona}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${isMyPersona ? "left-6" : "left-1"}`} />
        </button>
      </label>

      <textarea
        value={rawText}
        onChange={(event) => setRawText(event.target.value)}
        placeholder={source === "prompt" ? "ChatGPT/Gemini가 생성한 게임용 AI 분신 프로필을 붙여넣으세요." : "카카오톡 대화 txt 내용을 붙여넣거나 파일을 업로드하세요. 분석 전 닉네임, 시간, 날짜, 시스템 메시지는 제거됩니다."}
        className="mt-3 min-h-44 w-full resize-y rounded-[8px] border border-line bg-black/30 px-4 py-3 text-sm leading-6 outline-none focus:border-kakao"
      />

      <button
        onClick={createPersona}
        disabled={!rawText.trim() || isGenerating}
        className="mt-3 rounded-[8px] bg-white px-4 py-3 text-sm font-black text-black transition hover:bg-kakao disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        {isGenerating ? "분석 중..." : "AI 분신 프로필 생성"}
      </button>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {personas.map((persona) => (
          <article key={persona.id} className="rounded-[8px] border border-line bg-white/[0.03] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-black">{persona.name}</h3>
                <p className="mt-1 text-sm text-slate-300">{persona.summary}</p>
                {persona.isMyPersona && <p className="mt-2 inline-flex rounded-full bg-kakao px-2 py-1 text-xs font-black text-black">내 분신</p>}
              </div>
              <button onClick={() => onRemove(persona.id)} className="text-xs text-slate-400 hover:text-white">삭제</button>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div><dt className="text-slate-500">말투</dt><dd>{persona.speechStyle}</dd></div>
              <div><dt className="text-slate-500">성격</dt><dd>{persona.personality}</dd></div>
              <div><dt className="text-slate-500">행동 규칙</dt><dd>{persona.behaviorRules.join(" / ")}</dd></div>
              <div><dt className="text-slate-500">판단</dt><dd>{persona.decisionStyle}</dd></div>
              <div className="flex gap-2 text-xs">
                <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-cyan-100">협동 {persona.cooperation}</span>
                <span className="rounded-full bg-rose-400/10 px-2 py-1 text-rose-100">배신 {persona.betrayal}</span>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
