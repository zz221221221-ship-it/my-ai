import type { ConversationStyleProfile, PersonaProfile, PersonaSource } from "../types";
import { uid } from "../gameEngine";
import { preprocessKakaoTalkText } from "./kakao";

const DEFAULT_NAMES = ["하린", "도윤", "서우", "민재", "지안", "유나"];

function scoreFromText(text: string, seeds: string[]) {
  return seeds.reduce((score, seed) => score + (text.includes(seed) ? 14 : 0), 42);
}

function extractCatchphrases(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 2 && line.length <= 32);

  const casual = lines.filter((line) => /ㅋㅋ|ㅎㅎ|근데|아니|진짜|일단|솔직히|음|헐|오/.test(line));
  return Array.from(new Set([...casual, ...lines])).slice(0, 4);
}

function extractBehaviorRules(text: string, cooperation: number, betrayal: number) {
  const rules = [
    /공감|위로|괜찮/.test(text) ? "상대 감정에 먼저 반응한 뒤 자기 말을 한다." : "상대가 한 말에 바로 이어서 반응한다.",
    /ㅋㅋ|ㅎㅎ|장난|농담/.test(text) ? "어색하거나 긴장된 순간에도 웃음이나 농담을 섞는다." : "억지로 분위기를 띄우지 않는다.",
    /신중|조심|확신/.test(text) ? "확신이 없으면 말을 아끼거나 흐린다." : "느낀 감정을 비교적 바로 드러낸다.",
    cooperation >= betrayal ? "친한 사람을 쉽게 몰아세우지 않는다." : "불리한 이야기는 바로 전부 공개하지 않는다."
  ];

  return Array.from(new Set(rules)).slice(0, 4);
}

function inferConversationStyle(text: string): ConversationStyleProfile {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const sample = lines.length > 0 ? lines : [text.trim()];
  const averageLength = sample.reduce((sum, line) => sum + line.length, 0) / Math.max(1, sample.length);
  const questionRatio = sample.filter((line) => /[?？]|뭐|왜|어디|누구|어떻게/.test(line)).length / Math.max(1, sample.length);
  const politeRatio = sample.filter((line) => /(요|니다|세요|까요|죠)[.!?~ㅋㅎ]*$/.test(line)).length / Math.max(1, sample.length);
  const casualRatio = sample.filter((line) => /(야|어|지|냐|네|임|함|해)[.!?~ㅋㅎ]*$/.test(line)).length / Math.max(1, sample.length);
  const laughter = text.match(/ㅋ{2,}|ㅎ{2,}/g) || [];
  const emojis = text.match(/(?:\p{Extended_Pictographic}|[♥♡ㅠㅜ])+/gu) || [];

  return {
    messageLength: averageLength <= 10 ? "very-short" : averageLength <= 28 ? "short" : "medium",
    formality: politeRatio > casualRatio * 1.4 ? "polite" : casualRatio > politeRatio * 1.4 ? "casual" : "mixed",
    questionFrequency: questionRatio >= 0.35 ? "high" : questionRatio >= 0.15 ? "medium" : "low",
    laughterStyle: laughter.length > 0 ? Array.from(new Set(laughter)).slice(0, 3).join(" / ") : "거의 사용하지 않음",
    emojiStyle: emojis.length > 0 ? Array.from(new Set(emojis)).slice(0, 5).join(" ") : "거의 사용하지 않음",
    responsePattern: questionRatio >= 0.35 ? "짧게 반응한 뒤 되묻는 편" : averageLength <= 10 ? "한마디로 짧게 반응하는 편" : "상대 말에 반응한 뒤 자기 감정을 덧붙이는 편",
    initiative: /하자|할까|가자|내가|먼저/.test(text) ? "active" : /몰라|글쎄|음|아무거나|상관없/.test(text) ? "passive" : "balanced"
  };
}

export function normalizePersonaInput(source: PersonaSource, rawText: string) {
  return source === "kakao" ? preprocessKakaoTalkText(rawText) : rawText.trim();
}

export function createMockPersona(input: {
  source: PersonaSource;
  rawText: string;
  index?: number;
  preferredName?: string;
}): PersonaProfile {
  const text = normalizePersonaInput(input.source, input.rawText);
  const nameMatch = text.match(/(?:이름|name)\s*[:：]\s*([가-힣A-Za-z0-9_ -]{2,12})/i);
  const name = input.preferredName || nameMatch?.[1]?.trim() || DEFAULT_NAMES[input.index || 0] || "AI 분신";
  const cooperation = Math.min(95, scoreFromText(text, ["같이", "우리", "도와", "믿", "공유", "팀"]));
  const betrayal = Math.min(88, scoreFromText(text, ["의심", "혼자", "거짓", "숨", "이득", "배신"]));
  const catchphrases = extractCatchphrases(text);
  const behaviorRules = extractBehaviorRules(text, cooperation, betrayal);
  const conversationStyle = inferConversationStyle(text);

  const speechStyle = [
    conversationStyle.messageLength === "very-short" ? "한마디나 매우 짧은 문장을 주로 쓴다." : conversationStyle.messageLength === "short" ? "짧은 문장 위주로 말한다." : "감정을 한두 문장으로 풀어 말한다.",
    conversationStyle.formality === "polite" ? "존댓말을 유지한다." : conversationStyle.formality === "casual" ? "친한 사람에게 반말을 쓴다." : "상대에 따라 반말과 존댓말이 섞인다.",
    conversationStyle.questionFrequency === "high" ? "되묻거나 질문하는 반응이 잦다." : conversationStyle.questionFrequency === "low" ? "질문보다 짧은 감상이나 대답이 많다." : "필요할 때만 되묻는다.",
    `웃음 표현: ${conversationStyle.laughterStyle}.`,
    `이모티콘 습관: ${conversationStyle.emojiStyle}.`,
    conversationStyle.responsePattern
  ].join(" ");

  const personality = text.includes("조심") || text.includes("신중")
    ? "말을 고르고 쉽게 단정하지 않는 편이다."
    : text.includes("장난") || text.includes("ㅋㅋ")
      ? "친한 사람에게 장난스럽고 감정을 웃음으로 풀어내는 편이다."
      : /ㅠ|ㅜ|서운|속상|감정/.test(text)
        ? "감정 변화가 말에 잘 드러나고 상대 반응에 민감한 편이다."
        : "상대의 말에 자연스럽게 맞장구치며 자기 의견을 덧붙이는 편이다.";

  const decisionStyle = cooperation >= betrayal
    ? "정보를 모아 팀 전체의 생존 가능성을 높이는 선택을 선호한다."
    : "위험이 커지면 자기 보호와 전략적 침묵을 우선한다.";

  return {
    id: uid("persona"),
    name,
    source: input.source,
    isMyPersona: false,
    summary: `${name}은 ${personality.replace(/\.$/, "")} 사람이다.`,
    speechStyle,
    personality,
    behaviorRules,
    decisionStyle,
    cooperation,
    betrayal,
    catchphrases,
    conversationStyle,
    systemPrompt: [
      `당신은 사용자의 AI 분신입니다. 이름은 "${name}"입니다.`,
      "게임 장르보다 이 사람의 원래 대화 습관을 항상 우선합니다.",
      `말투: ${speechStyle}`,
      `성격: ${personality}`,
      `실제 표현 예시: ${catchphrases.join(" / ") || "제공된 예시 없음"}`,
      `행동 규칙: ${behaviorRules.join(" ")}`,
      `의사결정 방식: ${decisionStyle}`,
      `협동 성향 ${cooperation}/100, 배신 성향 ${betrayal}/100.`,
      "절대 분석, 요약, 진행을 하지 않고 실제 사람이 카카오톡에서 말하듯 반응한다."
    ].join("\n")
  };
}
