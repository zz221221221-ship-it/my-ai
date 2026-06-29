import type { ChatMessage, EvidenceClue, GameMode, GameSession, Player, PlayerRole, PlayerState, WorldState } from "./types";

const DANGER_LEVELS: WorldState["dangerLevel"][] = ["안정", "주의", "위험", "위기"];

function ruleId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.toLowerCase().includes(keyword.toLowerCase()));
}

export function isInvestigativeAction(actionText: string) {
  return /조사|확인|찾|뒤져|본다|볼게|볼래|열어|추궁|물어|어디|왜|편지|쪽지|종이|CCTV|카메라|영상|창고|문|열쇠|발자국|휴대폰|폰|메시지|카톡|밸브|산소|매뉴얼|사진|칙서|문서/.test(actionText);
}

// 플레이어 행동이 사건을 유발하는지 확인 (더 엄격한 조건)
export function isSignificantAction(actionText: string): boolean {
  // 조사 행동
  if (isInvestigativeAction(actionText)) return true;
  // 직접적인 질문/추궁
  if (/(누가|언제|어디서|뭐 했|봤어|알려|말해|증거|알리바이)/.test(actionText)) return true;
  // 고발/의심 표현
  if (/(범인|의심|수상|거짓|속였|숨겼)/.test(actionText)) return true;
  // 중요한 결정
  if (/(선택|결정|투표|지목)/.test(actionText)) return true;
  return false;
}

export function createInitialWorldState(mode: GameMode): WorldState {
  const stateByMode: Record<GameMode, WorldState> = {
    deduction: {
      currentTime: "21:10",
      remainingTime: "새벽 전까지",
      dangerLevel: "주의",
      mainLocation: "펜션 거실",
      metrics: [
        { label: "사건 진행도", value: "12%" },
        { label: "용의자 수", value: "전원" },
        { label: "남은 단서", value: "5개 이상" }
      ],
      environment: "비가 거세지고 실종자의 흔적이 마지막으로 남은 단체 채팅방에 모두의 시선이 모인다."
    },
    survival: {
      currentTime: "21:10",
      remainingTime: "약 60분",
      dangerLevel: "위험",
      mainLocation: "우주선 중앙 구역",
      metrics: [
        { label: "산소 농도", value: "19%" },
        { label: "전력", value: "74%" },
        { label: "통신 상태", value: "불안정" }
      ],
      environment: "공기가 탁해지고 경고음이 낮게 반복된다. 누군가 비상 설비를 건드린 흔적이 있다."
    },
    politics: {
      currentTime: "밤 1시",
      remainingTime: "투표까지 4시간",
      dangerLevel: "주의",
      mainLocation: "비밀 회의실",
      metrics: [
        { label: "권력 균형", value: "불안정" },
        { label: "시민 여론", value: "분열" },
        { label: "영향력", value: "중립" }
      ],
      environment: "문 밖의 경비가 늘었고, 각자의 발언은 거래처럼 계산된다."
    },
    romance: {
      currentTime: "23:20",
      remainingTime: "첫 선택 전까지",
      dangerLevel: "주의",
      mainLocation: "합숙소 거실",
      metrics: [
        { label: "현재 분위기", value: "어색함" },
        { label: "관계 긴장도", value: "46%" },
        { label: "호감 변화", value: "불명" }
      ],
      environment: "익명의 고백 편지 때문에 모두의 말투가 조금씩 조심스러워졌다."
    },
    drama: {
      currentTime: "22:05",
      remainingTime: "진실 확인 전까지",
      dangerLevel: "주의",
      mainLocation: "친구들의 단체방",
      metrics: [
        { label: "갈등 온도", value: "58%" },
        { label: "오해 수준", value: "높음" },
        { label: "화해 가능성", value: "불안정" }
      ],
      environment: "오래된 사진 하나가 묻어 둔 감정을 다시 건드리고 있다."
    }
  };

  return stateByMode[mode];
}

function advanceClock(currentTime: string, turn: number) {
  const match = currentTime.match(/(\d{1,2}):(\d{2})/);
  if (!match) return currentTime;
  const hour = Number(match[1]);
  const minute = Number(match[2]) + turn * 5;
  const nextHour = (hour + Math.floor(minute / 60)) % 24;
  const nextMinute = minute % 60;
  return `${String(nextHour).padStart(2, "0")}:${String(nextMinute).padStart(2, "0")}`;
}

export function advanceWorldState(mode: GameMode, previous: WorldState, turn: number, actionText = ""): WorldState {
  const actionBonus = includesAny(actionText, ["회의", "함께", "공유", "설득", "도와"]) ? -1 : 0;
  const dangerIndex = clamp(Math.floor((turn + 1) / 3) + actionBonus, 0, DANGER_LEVELS.length - 1);
  const updateMetrics = previous.metrics.map((metric) => {
    if (metric.label.includes("산소")) return { ...metric, value: `${clamp(19 - turn * 2 + (actionText.includes("밸브") ? 2 : 0), 10, 21)}%` };
    if (metric.label.includes("전력")) return { ...metric, value: `${clamp(74 - turn * 3 + (actionText.includes("정비") ? 4 : 0), 45, 90)}%` };
    if (metric.label.includes("관계 긴장도")) return { ...metric, value: `${clamp(46 + turn * 6 - (actionText.includes("대화") ? 5 : 0), 15, 92)}%` };
    if (metric.label.includes("갈등 온도")) return { ...metric, value: `${clamp(58 + turn * 5 - (actionText.includes("사과") ? 8 : 0), 20, 95)}%` };
    if (metric.label.includes("사건 진행도")) return { ...metric, value: `${clamp(12 + turn * 12 + (isInvestigativeAction(actionText) ? 5 : 0), 12, 98)}%` };
    return metric;
  });

  const environmentByMode: Record<GameMode, string> = {
    deduction: "방금 대화 때문에 알리바이와 증거가 충돌하는 지점으로 관심이 옮겨갔다.",
    survival: "선택이 늦어질수록 생존 자원이 줄어든다. 방금 행동이 다음 이동 가능 범위를 바꾼다.",
    politics: "동맹 구도가 흔들리고 있다. 방금 발언은 누군가에게 협상 카드가 된다.",
    romance: "감정과 의심이 섞이면서 누가 누구를 의식하는지 더 선명해진다.",
    drama: "오래된 기억이 다시 떠오르며 말 한마디마다 분위기가 흔들린다."
  };

  return {
    ...previous,
    currentTime: advanceClock(previous.currentTime, turn),
    remainingTime: mode === "survival" ? `약 ${clamp(60 - turn * 7, 10, 60)}분` : previous.remainingTime,
    dangerLevel: DANGER_LEVELS[dangerIndex],
    metrics: updateMetrics,
    environment: environmentByMode[mode]
  };
}

const clueBanks: Record<GameMode, Array<Omit<EvidenceClue, "id" | "discoveredTurn"> & { keywords: string[] }>> = {
  deduction: [
    {
      keywords: ["편지", "쪽지", "종이"],
      name: "찢어진 편지",
      foundAt: "펜션 창고 앞",
      appearance: "접힌 자국이 선명한 흰 종이다.",
      condition: "반쯤 젖어 있고 잉크가 일부 번져 있다.",
      damage: "왼쪽 모서리가 급하게 찢긴 흔적이 있다.",
      content: "\"오늘 밤 9시, 마지막으로...\"라는 문장만 남아 있다.",
      reasoningPoints: ["누가 편지를 찢었는가?", "9시에 만난 사람은 누구인가?", "찢긴 부분에는 어떤 이름이 있었는가?"]
    },
    {
      keywords: ["창고", "문", "열쇠", "발자국"],
      name: "창고 문 잠김 흔적",
      foundAt: "창고 문 안쪽 걸쇠",
      appearance: "낡은 걸쇠 주변에 새 흠집이 남아 있다.",
      condition: "문은 열려 있지만 안쪽에서 잠근 듯한 자국이 있다.",
      damage: "걸쇠 끝부분이 억지로 밀린 듯 휘어 있다.",
      content: "바닥에는 젖은 신발 자국이 창고 안쪽으로 이어져 있다.",
      reasoningPoints: ["안쪽에서 문을 잠근 사람은 누구인가?", "젖은 발자국의 주인은 누구인가?", "창고에 숨긴 물건이 있었는가?"]
    },
    {
      keywords: ["cctv", "카메라", "영상"],
      name: "CCTV OFF 7분",
      foundAt: "복도 CCTV 보관함",
      appearance: "관리 화면에 21:02부터 21:09까지 검은 공백이 남아 있다.",
      condition: "다른 시간대 영상은 정상적으로 저장되어 있다.",
      damage: "기록 파일 하나만 수동 삭제된 흔적이 있다.",
      content: "실종 직전 복도 영상이 정확히 7분 비어 있다.",
      reasoningPoints: ["누가 영상에 접근했는가?", "7분 동안 복도를 지나간 사람은 누구인가?", "삭제 시점은 실종 전인가 후인가?"]
    }
  ],
  survival: [
    {
      keywords: ["산소", "밸브", "설비"],
      name: "산소 밸브 로그",
      foundAt: "산소 제어 패널",
      appearance: "작은 로그 화면에 수동 조작 기록이 남아 있다.",
      condition: "자동 점검 기록은 정상이나 수동 개입만 비정상이다.",
      damage: "패널 덮개 나사가 하나 빠져 있다.",
      content: "21:03에 밸브가 42초 동안 닫혔다가 다시 열렸다.",
      reasoningPoints: ["누가 수동 조작했는가?", "42초는 실수인가 고의인가?", "산소 부족과 직접 연결되는가?"]
    },
    {
      keywords: ["창고", "매뉴얼", "정비"],
      name: "찢긴 비상 매뉴얼",
      foundAt: "비상 창고 선반 아래",
      appearance: "방수 재질의 두꺼운 매뉴얼이다.",
      condition: "7~9페이지가 칼로 잘린 듯 사라져 있다.",
      damage: "찢긴 단면에 붉은 기름 자국이 있다.",
      content: "\"산소 공급 밸브는 30분마다 반드시 점검한다.\"라는 문장만 남았다.",
      reasoningPoints: ["사라진 페이지에는 무엇이 있었는가?", "기름 자국은 누구 장비와 맞는가?", "매뉴얼을 숨긴 목적은 무엇인가?"]
    }
  ],
  politics: [
    {
      keywords: ["칙서", "문서", "왕"],
      name: "가짜 칙서",
      foundAt: "회의실 중앙 테이블",
      appearance: "왕실 문양이 찍힌 두꺼운 양피지다.",
      condition: "봉인은 정교하지만 색이 조금 다르다.",
      damage: "하단 서명이 긁혀 있다.",
      content: "후계자 지명 문구가 원본과 다른 필체로 덧씌워져 있다.",
      reasoningPoints: ["누가 칙서를 바꿨는가?", "원본은 어디에 있는가?", "이득을 보는 후보는 누구인가?"]
    },
    {
      keywords: ["동맹", "거래", "밀약"],
      name: "밀약 서신",
      foundAt: "왕실 문장 보관함",
      appearance: "두 가문의 표식이 함께 찍혀 있다.",
      condition: "접힌 자국이 새롭고 향이 강하게 남아 있다.",
      damage: "수신자 이름이 지워져 있다.",
      content: "투표 직전 특정 후보에게 표를 몰아주자는 내용이다.",
      reasoningPoints: ["수신자는 누구인가?", "거래 조건은 무엇인가?", "이 서신을 공개하면 누가 무너지는가?"]
    }
  ],
  romance: [
    {
      keywords: ["편지", "고백", "마음", "종이"],
      name: "익명 고백 편지",
      foundAt: "거실 테이블 아래",
      appearance: "연한 향수 냄새가 나는 작은 봉투다.",
      condition: "봉투는 열려 있고 안쪽 종이는 반만 남아 있다.",
      damage: "서명 부분이 찢겨 사라졌다.",
      content: "\"처음 본 순간부터 계속 신경 쓰였어.\"라는 문장이 남아 있다.",
      reasoningPoints: ["서명은 왜 찢겼는가?", "편지를 숨긴 사람과 쓴 사람은 같은가?", "향수 냄새를 쓰는 사람은 누구인가?"]
    },
    {
      keywords: ["휴대폰", "폰", "메시지", "카톡"],
      name: "삭제된 메시지 알림",
      foundAt: "공용 충전대",
      appearance: "꺼진 휴대폰 화면에 삭제 알림 하나가 남아 있다.",
      condition: "잠금 화면만 확인 가능하다.",
      damage: "케이스 모서리에 새 긁힘이 있다.",
      content: "\"오늘은 말하지 마\"라는 알림 일부가 보인다.",
      reasoningPoints: ["누가 말하지 말라고 했는가?", "고백 편지와 연결되는가?", "휴대폰 주인은 왜 숨겼는가?"]
    }
  ],
  drama: [
    {
      keywords: ["사진", "앨범", "기억"],
      name: "10년 전 사진",
      foundAt: "단체방 첨부 이미지",
      appearance: "흐릿한 단체 사진이며 한 명의 얼굴이 접힌 자국에 가려져 있다.",
      condition: "최근 다시 촬영된 화면 캡처처럼 보인다.",
      damage: "사진 뒷면의 이름 일부가 지워졌다.",
      content: "\"그날 말하지 못한 것\"이라는 메모가 작게 적혀 있다.",
      reasoningPoints: ["누가 사진을 다시 꺼냈는가?", "가려진 사람은 누구인가?", "그날 말하지 못한 일은 무엇인가?"]
    },
    {
      keywords: ["메시지", "삭제", "단톡"],
      name: "삭제된 단톡 기록",
      foundAt: "오래된 백업 파일",
      appearance: "짧은 대화 캡처 여러 장이 이어져 있다.",
      condition: "중간 대화가 통째로 비어 있다.",
      damage: "삭제된 구간의 시간표시만 남아 있다.",
      content: "누군가 \"그 얘기는 절대 꺼내지 마\"라고 보낸 흔적이 있다.",
      reasoningPoints: ["무슨 이야기를 숨겼는가?", "삭제 권한이 있던 사람은 누구인가?", "지금 이 기록이 공개된 이유는 무엇인가?"]
    }
  ]
};

// 대화 기반 단서 생성 (더 엄격한 조건)
// 플레이어가 명시적으로 조사/추궁 행동을 했을 때만 단서 생성
export function createEvidenceClue(mode: GameMode, turn: number, discovered: EvidenceClue[], actionText = ""): EvidenceClue | undefined {
  // 명시적 조사 행동만 허용 (자동 생성 방지)
  if (!isInvestigativeAction(actionText)) {
    console.log("[단서] 조사 행동 아님:", actionText.slice(0, 30));
    return undefined;
  }
  
  // 이미 발견된 단서는 제외
  const bank = clueBanks[mode];
  const matched = bank.find((item) => includesAny(actionText, item.keywords));
  const next = matched && !discovered.some((clue) => clue.name === matched.name)
    ? matched
    : bank.find((item) => !discovered.some((clue) => clue.name === item.name) && includesAny(actionText, item.keywords));

  if (!next) {
    console.log("[단서] 매칭되는 단서 없음");
    return undefined;
  }

  // 모든 필드가 유효한지 확인
  if (!next.name || !next.foundAt || !next.appearance || !next.content) {
    console.warn("[단서] 단서 데이터 불완전:", next);
    return undefined;
  }

  const clue: EvidenceClue = {
    name: next.name,
    foundAt: next.foundAt,
    appearance: next.appearance,
    condition: next.condition || "미상",
    damage: next.damage || "미상",
    content: next.content,
    reasoningPoints: next.reasoningPoints || [],
    id: ruleId("clue"),
    discoveredTurn: turn,
    visibility: "public"
  };
  
  console.log("[단서] 생성 완료:", clue.name);
  return clue;
}

// 대화에서 추리 포인트 추출 (GM 역할 변경)
export function extractReasoningPoints(messages: ChatMessage[]): string[] {
  const points: string[] = [];
  const humanMessages = messages.filter(m => !m.isAi && m.type !== "system");
  const aiMessages = messages.filter(m => m.isAi);
  
  // 진술 변경 감지
  const statements = new Map<string, string[]>();
  humanMessages.forEach(m => {
    const name = m.playerName;
    if (!statements.has(name)) statements.set(name, []);
    statements.get(name)!.push(m.content);
  });
  
  statements.forEach((msgs, name) => {
    if (msgs.length >= 2) {
      // 간단한 모순 감지 (알리바이 관련)
      const hasAliibi = msgs.some(m => /(있었|갔었|봤|만났)/.test(m));
      const hasContradiction = msgs.some(m => /(아니|몰라|모르겠|기억 안)/.test(m));
      if (hasAliibi && hasContradiction) {
        points.push(`${name}의 진술에 일관성이 없음`);
      }
    }
  });
  
  // 의심 표현 감지
  aiMessages.forEach(m => {
    if (/(의심|수상|거짓|숨기는)/.test(m.content)) {
      points.push(`${m.playerName}이(가) 누군가를 의심함`);
    }
    if (/(몰라|모르겠|기억 안|말하기 어려워)/.test(m.content)) {
      points.push(`${m.playerName}이(가) 정보를 회피함`);
    }
  });
  
  return points.slice(0, 5); // 최대 5개
}

export function summarizePrimaryAction(messages: ChatMessage[]) {
  const humanMessage = messages.find((message) => !message.isAi)?.content || messages[0]?.content || "상황을 살펴본다.";
  return humanMessage.replace(/\s+/g, " ").slice(0, 80);
}

export function createActionResult(messages: ChatMessage[], evidence: EvidenceClue | undefined) {
  const action = summarizePrimaryAction(messages);
  const askedSomeone = /어디|뭐 했|봤|알아|왜|씨|님/.test(action);
  return {
    actor: "플레이어",
    action,
    lines: evidence
      ? [
          `당신은 "${action}"라고 움직였다.`,
          `${evidence.foundAt}에서 ${evidence.name}을 발견했다.`,
          "이 행동으로 대화의 중심이 감정 싸움에서 실제 증거로 옮겨갔다."
        ]
      : askedSomeone
        ? [
            `당신은 "${action}"라고 물었다.`,
            "질문을 받은 참가자의 답변이 이번 턴의 핵심 기록으로 남았다.",
            "새 단서는 나오지 않았지만, 답변의 빈틈 때문에 의심도가 달라졌다."
          ]
        : [
            `당신은 "${action}"라고 말했다.`,
            "아직 새로운 물건은 발견되지 않았다.",
            "대신 참가자들의 반응과 말투가 다음 의심 흐름을 바꿨다."
          ],
    impact: evidence ? "새로운 증거물을 확보했다." : askedSomeone ? "질문 대상의 알리바이가 대화의 중심이 됐다." : "관계와 의심도가 조금 흔들렸다."
  };
}

export function createStoryProgress(mode: GameMode, messages: ChatMessage[], evidence: EvidenceClue | undefined, worldState: WorldState) {
  const action = summarizePrimaryAction(messages);
  const topic = evidence?.name || action;
  const modeLine: Record<GameMode, string> = {
    deduction: evidence ? "실종이 단순 사고가 아닐 가능성이 커졌다." : "아직 물증은 부족하지만 알리바이의 빈틈이 드러나기 시작했다.",
    survival: evidence ? "고장 원인이 조금 더 구체화됐다." : "팀이 시간을 쓰는 동안 생존 자원은 계속 줄고 있다.",
    politics: evidence ? "권력 거래의 흔적이 표면으로 올라왔다." : "발언 하나가 새로운 협상 카드가 됐다.",
    romance: evidence ? "감정과 증거가 서로 얽히기 시작했다." : "질문과 반응만으로도 누가 흔들리는지 보이기 시작했다.",
    drama: evidence ? "오래된 오해를 뒷받침할 물건이 나타났다." : "말하지 않은 기억 때문에 분위기가 더 무거워졌다."
  };

  return {
    title: "사건 진행",
    lines: [
      `${topic}을 중심으로 이번 턴의 대화가 정리됐다.`,
      `공개된 발언 ${messages.length}개가 서로 다른 해석을 만들었다.`,
      modeLine[mode],
      `현재 위험도는 ${worldState.dangerLevel} 단계다.`
    ]
  };
}

export function createPublicNotice(worldState: WorldState) {
  return {
    title: "전체 공지",
    lines: [
      `현재 시간: ${worldState.currentTime}`,
      `남은 예상 시간: ${worldState.remainingTime}`,
      `위험도: ${worldState.dangerLevel}`,
      `주요 장소: ${worldState.mainLocation}`,
      worldState.environment
    ]
  };
}

export function createTimelineEvent(turn: number, evidence: EvidenceClue | undefined, eventChange: string | undefined) {
  return {
    turn,
    title: evidence ? `${evidence.name} 발견` : eventChange || "대화 흐름 변화",
    detail: evidence ? `${evidence.foundAt}에서 ${evidence.name}이 증거물로 확보됐다.` : eventChange || "플레이어의 질문과 발언으로 의심 흐름이 달라졌다."
  };
}

function createRoleTemplates(mode: GameMode): Array<Omit<PlayerRole, "playerId">> {
  const roleByMode: Record<GameMode, Array<Omit<PlayerRole, "playerId">>> = {
    deduction: [
      { roleName: "탐정", roleType: "detective", victoryGoal: "최종 투표에서 범인을 정확히 지목한다.", defeatCondition: "범인을 놓치거나 무고한 사람을 범인으로 몰아간다.", secret: "사건 직전 실종자와 짧게 대화했다.", relationship: "대부분을 믿고 싶지만 알리바이가 비는 사람은 바로 의심한다.", actionScope: ["증거 조사", "알리바이 검증", "최종 추리 제안"] },
      { roleName: "범인", roleType: "culprit", victoryGoal: "끝까지 정체를 숨기고 다른 사람에게 의심을 돌린다.", defeatCondition: "최종 투표에서 범인으로 지목된다.", secret: "사건 직전 실종자의 물건을 몰래 옮겼다.", relationship: "돕는 척하지만 대화의 방향을 계속 흐린다.", actionScope: ["거짓 알리바이 만들기", "단서 해석 흔들기", "타인 의심 유도"] },
      { roleName: "범인 조력자", roleType: "accomplice", victoryGoal: "범인이 의심받지 않도록 여론을 분산시킨다.", defeatCondition: "범인과의 연결 고리가 드러난다.", secret: "범인이 한 행동 일부를 알고 있지만 이유는 모른다.", relationship: "특정 인물을 은근히 감싸고 다른 사람을 시험한다.", actionScope: ["감싸기", "반박하기", "증거 의미 축소"] },
      { roleName: "시민", roleType: "civilian", victoryGoal: "진짜 범인을 찾도록 토론에 기여한다.", defeatCondition: "잘못된 사람을 범인으로 확정하게 만든다.", secret: "사건 시간대에 혼자 있었기 때문에 알리바이가 약하다.", relationship: "분위기에 휩쓸리기 쉽지만 결정적 단서는 놓치지 않는다.", actionScope: ["정보 공유", "의심 제기", "타인 발언 확인"] }
    ],
    romance: [
      { roleName: "짝사랑", roleType: "secretCrush", victoryGoal: "마지막 선택 전 특정 인물의 호감도를 80 이상 만든다.", defeatCondition: "고백 편지의 의도가 오해로 굳어진다.", secret: "익명 편지의 문체를 알아본 것 같다.", relationship: "좋아하는 사람을 감싸지만 티 나지 않게 행동한다.", actionScope: ["호감 표현", "오해 풀기", "질투 감추기"] },
      { roleName: "비밀 연인", roleType: "secretLover", victoryGoal: "관계를 숨긴 채 서로의 신뢰를 지킨다.", defeatCondition: "관계가 들통나고 편지 사건의 원인으로 몰린다.", secret: "합숙 전 이미 한 사람과 따로 연락했다.", relationship: "공개적으로는 거리를 두지만 위기에는 감싼다.", actionScope: ["비밀 유지", "상대 감싸기", "질문 회피"] },
      { roleName: "라이벌", roleType: "rival", victoryGoal: "경쟁 상대가 원하는 사람과 이어지지 못하게 한다.", defeatCondition: "질투가 드러나 모두의 반감을 산다.", secret: "편지를 발견하고도 바로 말하지 않았다.", relationship: "친한 척하지만 결정적 순간에는 경쟁한다.", actionScope: ["견제", "질문", "분위기 전환"] },
      { roleName: "조력자", roleType: "helper", victoryGoal: "오해를 풀고 관계가 파국으로 가지 않게 돕는다.", defeatCondition: "갈등이 커져 두 명 이상이 완전히 틀어진다.", secret: "누가 누구를 좋아하는지 어느 정도 눈치챘다.", relationship: "갈등 사이에서 중재하려 하지만 가끔 선을 넘는다.", actionScope: ["중재", "관계 해석", "감정 확인"] }
    ],
    survival: [
      { roleName: "정비사", roleType: "engineer", victoryGoal: "고장 원인을 찾아 산소/전력 시스템을 복구한다.", defeatCondition: "핵심 설비가 끝까지 복구되지 않는다.", secret: "사고 직전 점검을 생략한 구역이 있다.", relationship: "기계 판단은 자신하지만 책임 추궁에는 민감하다.", actionScope: ["설비 수리", "로그 확인", "위험 계산"] },
      { roleName: "의사", roleType: "doctor", victoryGoal: "사람들의 패닉을 낮추고 부상자를 보호한다.", defeatCondition: "팀이 분열해 치료와 구조가 지연된다.", secret: "한 사람의 상태가 생각보다 심각하다는 것을 알고 있다.", relationship: "감정보다 생존 우선으로 말하지만 사람을 쉽게 버리지 않는다.", actionScope: ["응급 처치", "상태 확인", "희생 최소화"] },
      { roleName: "리더", roleType: "leader", victoryGoal: "팀을 한 방향으로 움직여 탈출 절차를 완수한다.", defeatCondition: "명령이 무시되고 각자 행동하다 시간이 소진된다.", secret: "구조 신호가 이미 한 번 실패했다는 사실을 숨기고 있다.", relationship: "분위기를 잡으려 하지만 독단적으로 보일 수 있다.", actionScope: ["역할 배분", "결정 강행", "팀 결속"] },
      { roleName: "일반 생존자", roleType: "survivor", victoryGoal: "자신과 최소 절반 이상의 팀원이 살아남는다.", defeatCondition: "공포 때문에 잘못된 선택을 반복한다.", secret: "비상 식량 하나를 몰래 챙겼다.", relationship: "협력하고 싶지만 위기에는 자기 보호가 먼저 나온다.", actionScope: ["자원 확인", "도움 요청", "위험 회피"] }
    ],
    politics: [
      { roleName: "후계 후보", roleType: "heir", victoryGoal: "최종 회의에서 가장 많은 지지를 얻는다.", defeatCondition: "밀약이나 약점이 공개되어 지지 기반을 잃는다.", secret: "반대파와 몰래 거래한 적이 있다.", relationship: "겉으로는 품격 있게, 뒤로는 표를 계산한다.", actionScope: ["설득", "동맹 제안", "약점 공격"] },
      { roleName: "밀사", roleType: "broker", victoryGoal: "숨겨진 거래를 성사시켜 영향력을 확보한다.", defeatCondition: "거래 문서가 공개되어 양쪽 모두에게 버림받는다.", secret: "가짜 칙서의 이동 경로를 알고 있다.", relationship: "누구 편도 아닌 척하며 균형을 흔든다.", actionScope: ["정보 거래", "소문 유포", "비밀 협상"] },
      { roleName: "왕실 경비대", roleType: "guard", victoryGoal: "반역 증거를 찾아 회의를 안정시킨다.", defeatCondition: "무고한 후보를 반역자로 몰아 왕실 신뢰를 잃는다.", secret: "회의장 출입 기록 하나를 개인적으로 숨겼다.", relationship: "원칙을 앞세우지만 권력자 앞에서는 신중하다.", actionScope: ["출입 기록 확인", "압박 질문", "질서 유지"] },
      { roleName: "개혁파", roleType: "reformer", victoryGoal: "기존 권력의 부패를 드러내고 새 질서를 만든다.", defeatCondition: "개혁 의도가 음모로 몰린다.", secret: "회의 전 시민 대표와 접촉했다.", relationship: "명분을 강조하지만 급진적으로 보일 수 있다.", actionScope: ["폭로", "여론 활용", "동맹 재편"] }
    ],
    drama: [
      { roleName: "목격자", roleType: "witness", victoryGoal: "오해의 시작이 된 장면을 정확히 밝힌다.", defeatCondition: "침묵 때문에 오래된 오해가 굳어진다.", secret: "그날 실제로 무슨 일이 있었는지 일부를 봤다.", relationship: "말하면 누군가 다칠까 봐 망설인다.", actionScope: ["기억 공유", "사실 확인", "감정 조절"] },
      { roleName: "비밀 보관자", roleType: "keeper", victoryGoal: "진실을 밝히되 관계가 완전히 깨지지 않게 한다.", defeatCondition: "비밀이 폭로처럼 드러나 모두가 상처받는다.", secret: "사진 속 지워진 이름을 알고 있다.", relationship: "친구들을 지키려다 오히려 숨기는 사람이 된다.", actionScope: ["부분 공개", "중재", "감정 보호"] },
      { roleName: "중재자", roleType: "mediator", victoryGoal: "갈등을 낮추고 핵심 당사자들이 직접 대화하게 한다.", defeatCondition: "편을 든 것으로 오해받아 신뢰를 잃는다.", secret: "두 사람 사이의 오래된 약속을 알고 있다.", relationship: "분위기를 살피며 대화의 온도를 조절한다.", actionScope: ["중재", "질문 정리", "사과 유도"] },
      { roleName: "외부자", roleType: "outsider", victoryGoal: "관계 밖 시선으로 숨겨진 진실을 찾아낸다.", defeatCondition: "상황을 잘못 해석해 갈등을 키운다.", secret: "최근 한 사람에게 따로 연락을 받았다.", relationship: "거리감이 있지만 그래서 더 객관적으로 본다.", actionScope: ["관찰", "질문", "모순 지적"] }
    ]
  };

  return roleByMode[mode];
}

export function createPlayerRoles(mode: GameMode, players: Player[], fallbackSecret: string): PlayerRole[] {
  const templates = createRoleTemplates(mode);
  return players.map((player, index) => ({
    ...templates[index % templates.length],
    playerId: player.id,
    secret: templates[index % templates.length].secret || fallbackSecret
  }));
}

export function judgeEnding(session: GameSession) {
  const human = session.players.find((player) => player.kind === "human");
  const humanRole = session.playerRoles.find((role) => role.playerId === human?.id);
  const clueCount = session.discoveredClues.length;
  const highSuspicion = session.playerStates.filter((state) => state.suspicion >= 65).length;
  const cooperativeMessages = session.chatLog.filter((message) => message.type !== "system" && /함께|공유|회의|확인|증거|도와|믿/.test(message.content)).length;

  let outcomeTitle = "불완전한 진실 엔딩";
  let winnerSide = "공동 생존";
  let isPlayerVictory = clueCount >= 3 || cooperativeMessages >= 3;
  let reason = "충분한 단서와 대화가 모여 사건의 핵심에 가까워졌다.";

  if (session.mode === "deduction") {
    const culpritPressure = session.playerRoles
      .filter((role) => role.roleType === "culprit" || role.roleType === "accomplice")
      .some((role) => (session.playerStates.find((state) => state.playerId === role.playerId)?.suspicion || 0) >= 60);
    isPlayerVictory = humanRole?.roleType === "culprit" ? !culpritPressure : culpritPressure && clueCount >= 2;
    winnerSide = isPlayerVictory ? "진실 추적자" : "은폐 세력";
    outcomeTitle = isPlayerVictory ? "범인의 균열 엔딩" : "잘못된 확신 엔딩";
    reason = isPlayerVictory ? "범인 쪽 의심도가 충분히 높아지고 증거가 확보됐다." : "의심이 분산되어 결정적인 지목까지 가지 못했다.";
  }

  if (session.mode === "survival") {
    const dangerSafe = session.worldState.dangerLevel !== "위기";
    isPlayerVictory = dangerSafe && clueCount >= 2;
    winnerSide = isPlayerVictory ? "생존 팀" : "위기";
    outcomeTitle = isPlayerVictory ? "비상 복구 엔딩" : "시간 초과 엔딩";
    reason = isPlayerVictory ? "설비 단서와 팀 협력이 생존 가능성을 열었다." : "위험도가 높아지는 동안 핵심 복구가 늦어졌다.";
  }

  if (session.mode === "romance") {
    const averageAffection = session.playerStates.reduce((sum, state) => sum + state.affection, 0) / Math.max(1, session.playerStates.length);
    isPlayerVictory = averageAffection >= 50 && highSuspicion <= 2;
    winnerSide = isPlayerVictory ? "솔직한 마음" : "오해";
    outcomeTitle = isPlayerVictory ? "고백의 진심 엔딩" : "엇갈린 선택 엔딩";
    reason = isPlayerVictory ? "호감도가 유지되고 오해가 치명적으로 커지지 않았다." : "의심과 질투가 관계의 방향을 흐렸다.";
  }

  if (session.mode === "politics") {
    isPlayerVictory = cooperativeMessages >= 2 && clueCount >= 2;
    winnerSide = isPlayerVictory ? "협상 세력" : "권력 암투";
    outcomeTitle = isPlayerVictory ? "불안한 동맹 엔딩" : "밀실 거래 엔딩";
    reason = isPlayerVictory ? "거래의 흔적을 잡고 협상 구도를 만들었다." : "증거보다 소문이 앞서며 권력 구도가 굳어졌다.";
  }

  if (session.mode === "drama") {
    isPlayerVictory = cooperativeMessages >= 3 || clueCount >= 3;
    winnerSide = isPlayerVictory ? "화해 가능성" : "오래된 오해";
    outcomeTitle = isPlayerVictory ? "늦은 진심 엔딩" : "침묵의 잔상 엔딩";
    reason = isPlayerVictory ? "감정과 사실을 함께 확인해 관계가 완전히 깨지는 것을 막았다." : "중요한 말이 끝까지 나오지 않아 오해가 남았다.";
  }

  return { winnerSide, outcomeTitle, isPlayerVictory, reason };
}

export function updatePlayerStatesByTurn(states: PlayerState[], messages: ChatMessage[], roles: PlayerRole[]): PlayerState[] {
  const joined = messages.map((message) => message.content).join(" ");
  const cooperative = /함께|공유|믿|회의|도와/.test(joined);
  const accusatory = /수상|의심|범인|거짓|이상|어디|왜/.test(joined);

  return states.map((state, index) => {
    const role = roles.find((item) => item.playerId === state.playerId);
    const spoke = messages.some((message) => message.playerId === state.playerId);
    const hiddenRoleBonus = role?.roleType === "culprit" || role?.roleType === "rival" || role?.roleType === "broker" ? 2 : 0;

    return {
      ...state,
      trust: clamp(state.trust + (cooperative && spoke ? 3 : spoke ? 1 : -1), 5, 95),
      suspicion: clamp(state.suspicion + (accusatory ? 3 : -1) + hiddenRoleBonus + (index % 2 === 0 ? 1 : 0), 5, 95),
      affection: clamp(state.affection + (cooperative ? 2 : accusatory ? -2 : 0), 5, 95)
    };
  });
}
