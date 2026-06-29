import type { ChatMessage, EvidenceClue, GameMode, Player, PlayerRole, PlayerState, WorldState } from "./types";

export type SpeechAct =
  | "의심하기"
  | "질문하기"
  | "변명하기"
  | "회피하기"
  | "농담하기"
  | "정보 숨기기"
  | "다른 사람 감싸기"
  | "떠보기"
  | "압박하기"
  | "감정적으로 반응하기"
  | "침묵에 가까운 짧은 반응";

export type Intent =
  | "질문"
  | "설명요청"
  | "반박"
  | "의심"
  | "화해"
  | "공감"
  | "공격"
  | "농담"
  | "확인"
  | "감정표현"
  | "주제변경"
  | "침묵"
  | "정보요청"
  | "지적"
  | "요청";

// Intent 분류 함수
export function classifyIntent(text: string): Intent {
  const normalized = text.trim().toLowerCase();

  // 침묵 또는 매우 짧은 반응
  if (normalized.length <= 2 || /^[.!?…]+$/.test(normalized)) return "침묵";

  // 확인 (긍정적 확인)
  if (/^(네|응|그래|ㅇㅇ|ok|okay|맞아|맞지|그렇지|아하|ㅎㅎ|ㅋㅋ)/.test(normalized)) return "확인";

  // 질문
  if (/\?$/.test(text) || /^(왜|뭐|어디|누가|언제|어떻게|몇|뭐야|뭐지|누구)/.test(normalized)) return "질문";

  // 정보 요청
  if (/(알려|말해|가르쳐|설명|정리|요약)/.test(normalized)) return "정보요청";

  // 요청
  if (/(해줘|하자|가자|보자|줘|please)/.test(normalized)) return "요청";

  // 반박
  if (/^(아니|아닙니다|그건|틀렸|아니야|말도 안|그렇지 않)/.test(normalized)) return "반박";

  // 의심
  if (/(의심|수상|거짓말|속인|숨겨|감춘|알면서|뻔한)/.test(normalized)) return "의심";

  // 지적
  if (/(모순|다르|바꿔|맞지 않|이상해|おかしい|이상한)/.test(normalized)) return "지적";

  // 공격 (강한 표현)
  if (/(야|꺼져|미친|개새|시발|좆|죽을|때릴|고발|경찰)/.test(normalized)) return "공격";

  // 화해
  if (/(미안|사과|송구|죄송|용서|화해|잘못)/.test(normalized)) return "화해";

  // 공감
  if (/(그렇지|맞아|동감|이해|공감|나도| 우리|함께)/.test(normalized)) return "공감";

  // 감정 표현
  if (/^(와|오|헐|어?|으악|기분|화나|짜증|서운|슬퍼|기쁘|좋아|행복|사랑|싫어)/.test(normalized)) return "감정표현";
  if (/(ㅋㅋ|ㅎㅎ|웃기|재밌|즐거)/.test(normalized)) return "감정표현";

  // 농담
  if (/(ㅋㅋㅋ|ㅎㅎㅎ|야민정음|드립|개그|웃긴|장난)/.test(normalized)) return "농담";

  // 주제 변경
  if (/^(그건 그렇고|그보다|다른|바꿔서|그만|다른 얘기)/.test(normalized)) return "주제변경";

  // 설명 요청 (더 넓은 매칭)
  if (/(왜 그런|그게 뭐|무슨 뜻|설명|의미|이유|원인)/.test(normalized)) return "설명요청";

  return "감정표현";
}

// Intent에 따른 응답 전략 매핑
function getSpeechActsForIntent(intent: Intent, mode: GameMode): SpeechAct[] {
  const intentMap: Record<Intent, SpeechAct[]> = {
    질문: ["질문하기", "변명하기", "떠보기"],
    설명요청: ["변명하기", "다른 사람 감싸기", "회피하기"],
    반박: ["변명하기", "의심하기", "농담하기"],
    의심: ["변명하기", "회피하기", "정보 숨기기", "다른 사람 감싸기"],
    화해: ["감정적으로 반응하기", "다른 사람 감싸기", "농담하기"],
    공감: ["감정적으로 반응하기", "농담하기", "떠보기"],
    공격: ["변명하기", "의심하기", "감정적으로 반응하기"],
    농담: ["농담하기", "감정적으로 반응하기", "침묵에 가까운 짧은 반응"],
    확인: ["질문하기", "떠보기", "감정적으로 반응하기"],
    감정표현: ["감정적으로 반응하기", "농담하기", "침묵에 가까운 짧은 반응"],
    주제변경: ["질문하기", "떠보기", "회피하기"],
    침묵: ["침묵에 가까운 짧은 반응", "감정적으로 반응하기"],
    정보요청: ["정보 숨기기", "회피하기", "변명하기"],
    지적: ["변명하기", "회피하기", "농담하기"],
    요청: ["회피하기", "떠보기", "의심하기"]
  };

  const preferred = intentMap[intent] || ["감정적으로 반응하기"];

  // 모드별 선호도 조정
  const modePreference: Record<GameMode, SpeechAct[]> = {
    deduction: ["의심하기", "질문하기", "변명하기", "회피하기", "정보 숨기기", "압박하기", "농담하기"],
    romance: ["떠보기", "감정적으로 반응하기", "회피하기", "질문하기", "농담하기", "정보 숨기기", "다른 사람 감싸기"],
    drama: ["감정적으로 반응하기", "압박하기", "정보 숨기기", "질문하기", "회피하기", "다른 사람 감싸기"],
    politics: ["떠보기", "압박하기", "다른 사람 감싸기", "정보 숨기기", "질문하기", "회피하기"],
    survival: ["감정적으로 반응하기", "압박하기", "변명하기", "질문하기", "다른 사람 감싸기", "정보 숨기기"]
  };

  return [...preferred, ...modePreference[mode]];
}

const MODE_SPEECH_ACTS: Record<GameMode, SpeechAct[]> = {
  deduction: ["의심하기", "질문하기", "변명하기", "회피하기", "정보 숨기기", "압박하기", "농담하기"],
  romance: ["떠보기", "감정적으로 반응하기", "회피하기", "질문하기", "농담하기", "정보 숨기기", "다른 사람 감싸기"],
  drama: ["감정적으로 반응하기", "압박하기", "정보 숨기기", "질문하기", "회피하기", "다른 사람 감싸기"],
  politics: ["떠보기", "압박하기", "다른 사람 감싸기", "정보 숨기기", "질문하기", "회피하기"],
  survival: ["감정적으로 반응하기", "압박하기", "변명하기", "질문하기", "다른 사람 감싸기", "정보 숨기기"]
};

// Intent + 성격에 따른 동적 발화 생성
interface DynamicLineContext {
  intent: Intent;
  act: SpeechAct;
  lastHumanText: string;
  playerName: string;
  personality: string;
  speechStyle: string;
  formality: "casual" | "polite" | "mixed";
  recentConversation: string[];
}

function generateDynamicLine(ctx: DynamicLineContext): string {
  const { intent, playerName, personality, speechStyle, formality } = ctx;

  // Intent 기반 기본 응답 패턴
  const intentPatterns: Record<Intent, string[]> = {
    질문: [
      `${playerName}이(가) 물어봤잖아.`,
      `글쎄, 잘 모르겠는데.`,
      `그건 나도 궁금해.`,
      `모르겠어, 너는?`
    ],
    설명요청: [
      `별로 설명할 게 없는데.`,
      `그냥 그런 거야.`,
      `말해도 너 이해 못 할걸.`,
      `나중에 말해줄게.`
    ],
    반박: [
      `아니, 그건 아니야.`,
      `내가 그렇게 말한 적 없는데.`,
      `오해하지 마.`,
      `말이 좀 달랐던 거야.`
    ],
    의심: [
      `왜 날 의심해?`,
      `나는 그런 적 없는데.`,
      `다른 사람 먼저 의심해봐.`,
      `뭔가 착각하는 거 같아.`
    ],
    화해: [
      `괜찮아, 신경 쓰지 마.`,
      `우리 이런 얘기 그만하자.`,
      `너도 그렇잖아.`,
      `서로 좀 양보하지.`
    ],
    공감: [
      `그치? 나도 그렇게 생각해.`,
      `맞아, 그게 문제야.`,
      `우리 생각이 같네.`,
      `나도 비슷한 경험 있어.`
    ],
    공격: [
      `너야말로 뭐야?`,
      `말조심해.`,
      `나한테 그런 식으로 말하지 마.`,
      `괜히 화내지 마.`
    ],
    농담: [
      `ㅋㅋㅋ`,
      `ㅎㅎ 진짜?`,
      `와 대박`,
      `장난이야?`
    ],
    확인: [
      `응.`,
      `그래.`,
      `맞아.`,
      `ㅇㅇ`
    ],
    감정표현: [
      `나도 그럴 때가 있어.`,
      `기분 이상하네.`,
      `왜 그래?`,
      `힘내.`
    ],
    주제변경: [
      `그건 나중에 하고.`,
      `다른 얘기할까?`,
      `그러고 보니...`,
      `아, 그건 그렇고.`
    ],
    침묵: [
      `...`,
      `음...`,
      `뭐야`,
      `그냥.`
    ],
    정보요청: [
      `알려줘야 하나...`,
      `말할 수 없어.`,
      `나중에 알려줄게.`,
      `그건 비밀이야.`
    ],
    지적: [
      `내가 뭘?`,
      `그냥 그런 거잖아.`,
      `너무 예민하게 반응하지 마.`,
      `잘못 들었나 봐.`
    ],
    요청: [
      `싫어.`,
      `나중에.`,
      `왜 내가?`,
      `그건 네가 해.`
    ]
  };

  // 성격 기반 변형
  const variations: string[] = [];

  // 말투 스타일에 따른 변형
  if (/짧|간결|짧은/.test(speechStyle) || speechStyle.includes("短句")) {
    variations.push(...(intentPatterns[intent] || []).map(s => s.split(/[,.]/)[0]?.trim() || s));
  }

  // 이모티콘/ㅋㅋ 사용 빈도
  if (/이모티콘|ㅋㅋ|ㅎㅎ|웃음/.test(personality)) {
    const emojis = ["ㅋㅋ", "ㅎㅎ", "ㅋ", "ㅎ"];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    variations.push(`${emoji} ${intentPatterns[intent]?.[0] || "그래..."}`);
  }

  // 반말/존댓말
  const baseLines = intentPatterns[intent] || ["..."];
  const selectedBase = variations.length > 0
    ? variations[Math.floor(Math.random() * variations.length)]
    : baseLines[Math.floor(Math.random() * baseLines.length)];

  // 존댓말 변환
  if (formality === "polite") {
    return toPolite(selectedBase);
  }

  return selectedBase;
}

const MODE_LINES: Record<GameMode, Partial<Record<SpeechAct, string[]>>> = {
  deduction: {
    의심하기: ["그 얘기 아까랑 좀 다른데?", "왜 하필 지금 그 말을 해?", "뭔가 숨기는 거 같아.", "너 그때 거기 있었지?"],
    질문하기: ["그때 진짜 혼자 있었어?", "그걸 직접 본 사람은 누구야?", "알리바이는 뭐야?", "왜 그런 행동을 했어?"],
    변명하기: ["나 그쪽에는 가지도 않았어.", "왜 갑자기 나한테 그래?", "오해하지 마.", "나는 아무것도 몰라."],
    회피하기: ["그건 아직 말하기 좀 그래.", "나도 확실한 건 몰라.", "나중에 말해줄게.", "지금은 답하기 어려워."],
    "정보 숨기기": ["들은 건 있는데 지금 말하긴 애매해.", "그 얘기는 조금 있다가 할게.", "알긴 한데..."],
    압박하기: ["말 돌리지 말고 그것부터 대답해봐.", "아까 한 말부터 다시 말해봐.", "솔직히 말해."],
    농담하기: ["ㅋㅋ 갑자기 다들 형사 됐네.", "이러다 나까지 범인 되겠네 ㅋㅋ", "우리 다 용의자네 ㅋㅋ"]
  },
  romance: {
    떠보기: ["그래서 너는 누구였으면 좋겠는데?", "왜, 혹시 마음 가는 사람 있어?", "너 그 편지 읽었어?"],
    "감정적으로 반응하기": ["나한테는 아무 말도 안 했잖아.", "별거 아닌데 좀 서운하네.", "왜 그런 말을 해?"],
    회피하기: ["내가 왜 말해야 돼 ㅋㅋ", "그건 그냥 비밀로 할래.", "말하고 싶지 않아."],
    질문하기: ["그 편지 보고 누구 생각났어?", "너 아까 왜 그렇게 웃었어?", "솔직히 말해봐."],
    농담하기: ["ㅋㅋ 설마 너였냐", "와 여기서 연애 예능 찍네 ㅋㅋ", "다들 배우네 ㅋㅋ"],
    "정보 숨기기": ["알 것 같긴 한데 말 안 할래.", "지금 말하면 너무 티 나잖아.", "나중에 알려줄게."],
    "다른 사람 감싸기": ["아직 아무것도 모르는데 몰아가진 마.", "그럴 수도 있지, 너무 의미 두지 마.", " 걔도 힘들었을 거야."]
  },
  drama: {
    "감정적으로 반응하기": ["그 얘기를 이제 와서 왜 꺼내?", "나 그때 일 아직도 안 잊었어.", "너무하다."],
    압박하기: ["이번에도 모른 척할 거야?", "숨기지 말고 그냥 말해.", "다 알아."],
    "정보 숨기기": ["그날 일은 나도 다 말 못 해.", "그건 내가 꺼낼 얘기가 아닌 것 같아."],
    질문하기: ["그 사진 네가 올린 거야?", "그때 무슨 일 있었는지 진짜 몰라?", "누가 먼저 시작한 거야?"],
    회피하기: ["나 지금 그 얘기 하고 싶지 않아.", "그만하자, 더 말하면 싸울 것 같아."],
    "다른 사람 감싸기": ["걔한테만 뭐라 하지 마.", "그때 다들 잘한 건 없잖아.", "서로 좀 이해하자."]
  },
  politics: {
    떠보기: ["너는 결국 어느 쪽에 설 건데?", "내 편 들면 너한테도 나쁘진 않을걸.", "선택해."],
    압박하기: ["지금 선택 안 하면 양쪽 다 널 못 믿어.", "말만 하지 말고 어느 쪽인지 정해.", "시간 없어."],
    "다른 사람 감싸기": ["저 사람 말도 한 번은 들어보자.", "지금 우리끼리 갈라지면 저쪽만 좋아."],
    "정보 숨기기": ["조건부터 듣고 말해줄게.", "내가 아는 걸 그냥 줄 수는 없지.", "거래하자."],
    질문하기: ["그래서 나한테 뭘 줄 수 있는데?", "그 약속 진짜 지킬 수 있어?", "신용은?"],
    회피하기: ["아직 누구 편이라고 한 적 없어.", "지금 답하면 나만 손해야.", "지금은 말하기 어려워."]
  },
  survival: {
    "감정적으로 반응하기": ["이러다 진짜 다 죽는 거 아니야?", "나 지금 너무 불안해.", "제발 좀 진정해."],
    압박하기: ["누군가는 지금 결정해야 돼.", "미루지 말고 하나 골라.", "시간 없어."],
    변명하기: ["그거 내가 망가뜨린 거 아니야.", "나도 시키는 대로 했어.", "내 탓 아니야."],
    질문하기: ["남은 게 진짜 이것뿐이야?", "누가 마지막으로 확인했어?", "비상용은?"],
    "다른 사람 감싸기": ["지금 한 명 탓할 때는 아니잖아.", "같이 살아야 되는데 싸우지 좀 마.", "단결해야 해."],
    "정보 숨기기": ["비상용으로 따로 둔 게 있긴 해.", "확실해지면 그때 말할게.", "나중에 알려줄게."]
  }
};

const GENERIC_LINES: Record<SpeechAct, string[]> = {
  의심하기: ["그 말은 좀 못 믿겠는데?", "뭔가 이상해.", "왜 그래?"],
  질문하기: ["진짜 그렇게 생각해?", "왜?", "근데 왜?"],
  변명하기: ["아니, 나는 그런 뜻 아니었어.", "오해하지 마.", "내가 아니라니까."],
  회피하기: ["음... 지금은 말 안 할래.", "나중에 말해.", "그만하자."],
  농담하기: ["ㅋㅋ 뭐야 갑자기", "ㅎㅎ 대박", "장난이야?"],
  "정보 숨기기": ["아는 건 있는데 아직은 비밀.", "말할 수 없어.", "나중에 알려줄게."],
  "다른 사람 감싸기": ["너무 몰아가지는 말자.", "걔도 사정이 있을 거야.", "서로 좀 이해하자."],
  떠보기: ["너는 어떻게 생각하는데?", "솔직히 말해봐.", "뭐야 진짜?"],
  압박하기: ["말 돌리지 말고 대답해봐.", "똑바로 말해.", "시간 없어."],
  "감정적으로 반응하기": ["나 이거 좀 싫은데.", "왜 그런 말을 해?", "기분 나빠."],
  "침묵에 가까운 짧은 반응": ["음...", "뭐야", "헐", "...", "그냥."]
};

export function getRecentOwnMessages(player: Player, chatLog: ChatMessage[]) {
  return chatLog.filter((message) => message.playerId === player.id).slice(-6).map((message) => message.content);
}

export function getLastHumanMessage(chatLog: ChatMessage[]) {
  return chatLog.filter((message) => message.type !== "system" && !message.isAi).at(-1);
}

// 최근 대화에서 맥락 추출
function getConversationContext(chatLog: ChatMessage[], maxLength: number = 8): string[] {
  return chatLog
    .filter((m) => m.type !== "system")
    .slice(-maxLength)
    .map((m) => `${m.playerName}: ${m.content}`);
}

export function assignSpeechAct(input: {
  player: Player;
  playerIndex: number;
  mode: GameMode;
  turn: number;
  playerState?: PlayerState;
  role?: PlayerRole;
  usedActs: SpeechAct[];
  lastHumanText: string;
  intent?: Intent;
}): SpeechAct {
  const intent = input.intent || classifyIntent(input.lastHumanText);
  const preferred = getSpeechActsForIntent(intent, input.mode);

  // 성격 기반 추가 선호
  const personaText = `${input.player.persona?.personality || ""} ${input.player.persona?.speechStyle || ""}`;
  const personalityPreferred: SpeechAct[] = [];

  if (/장난|웃|가볍|유머|ㅋㅋ|ㅎㅎ/.test(personaText)) personalityPreferred.push("농담하기");
  if (/감정|불안|예민|당황|짜증|서운/.test(personaText)) personalityPreferred.push("감정적으로 반응하기");
  if (/회피|조심|말을 아끼|소극/.test(personaText)) personalityPreferred.push("회피하기", "침묵에 가까운 짧은 반응");
  if (/직설|거침|당당|자신/.test(personaText)) personalityPreferred.push("압박하기", "의심하기");

  // 의심도 기반
  if ((input.playerState?.suspicion || 0) >= 60) personalityPreferred.push("변명하기", "회피하기");

  // 역할 기반
  if (["culprit", "broker", "rival"].includes(input.role?.roleType || "")) {
    personalityPreferred.push("정보 숨기기", "떠보기", "회피하기");
  }

  const combined = [...personalityPreferred, ...preferred];
  const modeActs = MODE_SPEECH_ACTS[input.mode];
  const offset = (input.turn + input.playerIndex) % modeActs.length;
  const rotated = modeActs.slice(offset).concat(modeActs.slice(0, offset));

  return [...combined, ...rotated].find((act) => !input.usedActs.includes(act)) || rotated[0];
}

// 강화된 발화 정규화 함수
export function normalizeSpeech(text: string): string {
  return text
    // 공백 정규화
    .replace(/\s+/g, "")
    // 특수문자 제거
    .replace(/[^\w가-힣]/g, "")
    // 반복 감정표현 축약 (ㅋㅋㅋㅋ -> ㅋㅋ, ㅎㅎㅎㅎ -> ㅎㅎ)
    .replace(/ㅋ{2,}/g, "ㅋ")
    .replace(/ㅎ{2,}/g, "ㅎ")
    .replace(/ㅜ{2,}/g, "ㅜ")
    // 조사/어미 차이 무시 (은/는, 이/가, 을/를, 에게/한테)
    .replace(/(은|는|이|가|을|를|에게|한테|께서|에서|로|으로)/g, "")
    // 짧은 감탄사 제거
    .replace(/^(아|오|어|으|음|헐|와|오|네|응|그래|ㅇㅇ)/, "")
    // "왜 내가" 류의 패턴 정규화
    .replace(/왜\s*(내가|내가|니가|네가)/, "왜")
    // "몰라" 류의 패턴 정규화
    .replace(/(나\s*)?몰라(요)?/, "몰라")
    .replace(/잘\s*모르(겠)?(는데|지만)?/, "몰라")
    .replace(/기억\s*안\s*나/, "몰라")
    // 소문자/대문자 통일 (영어)
    .toLowerCase()
    // 10자까지만 유지
    .slice(0, 10);
}

// 유사도 검사 (더 엄격해짐)
export function isSimilarSpeech(candidate: string, existingLines: string[]): boolean {
  const normalizedCandidate = normalizeSpeech(candidate);
  
  // 너무 짧은 발화는 항상 중복으로 간주
  if (normalizedCandidate.length <= 3) {
    return existingLines.some(line => normalizeSpeech(line) === normalizedCandidate);
  }
  
  return existingLines.some(line => {
    const normalizedLine = normalizeSpeech(line);
    
    // 완전 일치
    if (normalizedLine === normalizedCandidate) return true;
    
    // 포함 관계 (70% 이상 일치)
    const shorter = normalizedCandidate.length < normalizedLine.length ? normalizedCandidate : normalizedLine;
    const longer = normalizedCandidate.length >= normalizedLine.length ? normalizedCandidate : normalizedLine;
    
    if (shorter.length >= 3 && longer.includes(shorter.slice(0, Math.ceil(shorter.length * 0.7)))) {
      return true;
    }
    
    // 핵심 키워드 일치 (의미 기반)
    const candidateKeywords = extractKeywords(candidate);
    const lineKeywords = extractKeywords(line);
    const commonKeywords = candidateKeywords.filter(k => lineKeywords.includes(k));
    
    // 짧은 문장일수록 더 엄격하게 검사
    const threshold = candidate.length <= 10 ? 0.8 : candidate.length <= 20 ? 0.6 : 0.5;
    
    if (commonKeywords.length / Math.max(candidateKeywords.length, 1) >= threshold) {
      return true;
    }
    
    return false;
  });
}

// 핵심 키워드 추출
function extractKeywords(text: string): string[] {
  const stopWords = ["이", "그", "저", "것", "수", "등", "및", "의", "에", "를", "을", "는", "은", "가", "한", "하다", "하다"];
  return text
    .replace(/[^\w가-힣\s]/g, "")
    .split(/\s+/)
    .filter(word => word.length >= 2 && !stopWords.includes(word));
}

function isSimilar(candidate: string, messages: string[]) {
  return isSimilarSpeech(candidate, messages);
}

function toPolite(text: string) {
  return text
    .replace(/했잖아/g, "했잖아요")
    .replace(/하네([.!?])/g, "하네요$1")
    .replace(/했어\?/g, "했어요?")
    .replace(/있어\?/g, "있어요?")
    .replace(/없어\?/g, "없어요?")
    .replace(/거야\?/g, "거예요?")
    .replace(/인데\?/g, "인데요?")
    .replace(/말해\./g, "말해주세요.")
    .replace(/말해\?/g, "말해줄래요?")
    .replace(/할래\./g, "할래요.")
    .replace(/할게\./g, "할게요.")
    .replace(/했어\./g, "했어요.")
    .replace(/있어\./g, "있어요.")
    .replace(/없어\./g, "없어요.")
    .replace(/아니야\./g, "아니에요.")
    .replace(/몰라\./g, "몰라요.")
    .replace(/같아\./g, "같아요.")
    .replace(/마\./g, "마요.")
    .replace(/해\./g, "해요.");
}

function addPersonaRhythm(text: string, player: Player, turn: number) {
  const persona = player.persona;
  const style = persona?.conversationStyle;
  let output = style?.formality === "polite" || /존댓말|해요체/.test(persona?.speechStyle || "") ? toPolite(text) : text;

  // catchphrase 적용
  const examples = persona?.catchphrases || [];
  const opener = examples
    .map((line) => line.match(/^(ㅋㅋ+|ㅎㅎ+|아니+|근데|헐+|음+|오+|와+|뭐야)/)?.[0])
    .find(Boolean);
  if (opener && turn % 3 === 0 && !output.startsWith(opener)) output = `${opener} ${output}`;

  // 문장 길이 스타일
  if (style?.messageLength === "very-short") {
    output = output.split(/[,.]/)[0].trim();
    if (output.length > 25) output = `${output.slice(0, 24).trim()}...`;
  } else if (style?.messageLength === "short") {
    if (output.length > 40) output = `${output.slice(0, 39).trim()}...`;
  }

  return output.replace(/\s+/g, " ").trim();
}

function pickModeLine(mode: GameMode, act: SpeechAct, seed: number, avoid: string[]) {
  const pool = MODE_LINES[mode][act] || GENERIC_LINES[act];
  for (let index = 0; index < pool.length; index += 1) {
    const candidate = pool[(seed + index) % pool.length];
    if (!isSimilar(candidate, avoid)) return candidate;
  }
  return GENERIC_LINES[act][seed % GENERIC_LINES[act].length];
}

export function createPersonaSpeech(input: {
  player: Player;
  playerIndex: number;
  mode: GameMode;
  turn: number;
  situation: string;
  caseMemo: string[];
  discoveredClues: EvidenceClue[];
  turnGoal: string;
  mySecret: string;
  playerStates: PlayerState[];
  playerRoles?: PlayerRole[];
  worldState?: WorldState;
  actionResult?: string;
  storyProgress?: string;
  publicNotice?: string;
  chatLog: ChatMessage[];
  assignedSpeechAct?: SpeechAct;
  alreadySaidThisTurn?: string[];
  intent?: Intent;
}) {
  const role = input.playerRoles?.find((item) => item.playerId === input.player.id);
  const state = input.playerStates.find((item) => item.playerId === input.player.id);
  const lastHumanMessage = getLastHumanMessage(input.chatLog);
  const lastHumanText = lastHumanMessage?.content || "";
  const intent = input.intent || classifyIntent(lastHumanText);
  const previous = getRecentOwnMessages(input.player, input.chatLog);
  const alreadySaid = input.alreadySaidThisTurn || [];
  const recentConversation = getConversationContext(input.chatLog, 8);

  const formality = input.player.persona?.conversationStyle?.formality ||
    /존댓|해요/.test(input.player.persona?.speechStyle || "") ? "polite" : "casual";

  const act = input.assignedSpeechAct || assignSpeechAct({
    player: input.player,
    playerIndex: input.playerIndex,
    mode: input.mode,
    turn: input.turn,
    playerState: state,
    role,
    usedActs: [],
    lastHumanText,
    intent
  });

  // Intent + 성격 기반 동적 발화 생성 시도
  const shouldGenerateDynamic =
    intent !== "침묵" &&
    input.player.persona?.personality &&
    input.player.persona?.speechStyle;

  let line: string;

  if (shouldGenerateDynamic && Math.random() > 0.4) {
    // 동적 발화 생성
    line = generateDynamicLine({
      intent,
      act,
      lastHumanText,
      playerName: lastHumanMessage?.playerName || "사람",
      personality: input.player.persona?.personality || "",
      speechStyle: input.player.persona?.speechStyle || "",
      formality,
      recentConversation
    });
  } else {
    // 기존 모드별 발화 풀 사용
    line = pickModeLine(input.mode, act, input.turn + input.playerIndex, [...previous, ...alreadySaid]);
  }

  return addPersonaRhythm(line, input.player, input.turn + input.playerIndex);
}
