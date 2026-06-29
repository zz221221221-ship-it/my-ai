# AI 분신 소셜 추리 게임 - 다음 세션 인수인계

마지막 정리일: 2026-06-29 (세션 4차 업데이트 - 중복 발화 방지)

## 작업 대상

- 프로젝트 경로: `C:\Users\정선우\Desktop\my-ai`
- 개발 주소: `http://localhost:3001/`
- 이 저장소의 AI 분신 추리 게임만 수정한다.
- 루트의 `cafe-tycoon.html`은 다른 게임이므로 참고하거나 수정하지 않는다.
- 기존 프로젝트를 새로 만들지 말고 현재 Next.js 코드베이스를 이어서 리팩터링한다.

## 기술 구성

- Next.js 16 App Router
- React 18
- TypeScript
- Tailwind CSS
- 브라우저 상태 및 `localStorage`
- OpenRouter 서버 API 호출
- 사용 모델: `google/gemini-3.1-flash-lite`

PowerShell에서는 실행 정책 문제를 피하기 위해 `npm` 대신 `npm.cmd`를 사용한다.

```powershell
npm.cmd run dev -- --port 3001
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

## 환경변수

`.env.local`에 다음 값이 설정되어 있음:

```text
OPENROUTER_API_KEY=<secret>
OPENROUTER_MODEL=google/gemini-3.1-flash-lite
OPENROUTER_SITE_URL=http://localhost:3001
OPENROUTER_APP_NAME=AI Persona Social Deduction
```

## 이번 세션 작업 내용 (2026-06-29 중복 발화 방지)

### 중복 발화 방지 시스템 구현

#### 1. 발화 기록 저장 구조 (`lib/types.ts`)
```typescript
// AI 발화 기록 (중복 방지용)
export interface SpokenLine {
  playerId: string;
  playerName: string;
  turn: number;
  original: string;        // 원문 발화
  normalized: string;      // 정규화된 발화
  speechAct?: string;      // 발화 전략
  intent?: string;         // 발화 의도
}

export interface GameSession {
  // ... 기존 필드
  spokenLineHistory: SpokenLine[];  // 세션 전체 발화 기록
  usedSpeechActs: Record<string, string[]>;  // AI별 사용된 발화 전략
}
```

#### 2. 발화 정규화 함수 (`lib/personaSpeech.ts`)
- `normalizeSpeech()`: 발화를 정규화하여 유사도 검사
  - 공백, 특수문자 제거
  - 반복 감정표현 축약 (ㅋㅋㅋㅋ → ㅋㅋ)
  - 조사/어미 차이 무시
  - 짧은 감탄사 제거
  - "왜 내가", "몰라" 등 패턴 정규화

#### 3. 유사도 검사 로직 (`lib/personaSpeech.ts`)
- `isSimilarSpeech()`: 후보 발화가 기존 발화와 유사한지 검사
  - 완전 일치 검사
  - 포함 관계 검사 (70% 이상 일치)
  - 핵심 키워드 일치 (의미 기반)
  - 짧은 문장일수록 더 엄격하게 검사

#### 4. 중복 시 재생성 (`lib/ai.ts`)
- 최대 2회 재생성 시도
- 중복 감지 시 fallback으로 전환
- 최대 시도 후에도 중복이면 강제 생성 (새로운 전략 선택)

#### 5. 발화 전략 중복 금지 (`lib/ai.ts`)
- 각 AI별 사용된 발화 전략 기록
- 아직 사용하지 않은 전략 우선 선택
- 모든 전략을 사용했으면 순환

#### 6. 게임 페이지 통합 (`app/game/page.tsx`)
- `generateAiTurnMessages()` 호출 시 발화 기록 전달
- 결과에서 `newSpokenLines`, `newUsedSpeechActs` 수신
- `nextSession` 생성 시 발화 기록 업데이트

### 주요 변경 사항

| 파일 | 변경 내용 |
|------|----------|
| `lib/types.ts` | `SpokenLine` 인터페이스, `GameSession`에 `spokenLineHistory`, `usedSpeechActs` 추가 |
| `lib/gameEngine.ts` | `createGameSession()`, `loadSession()`에서 새 필드 초기화 |
| `lib/personaSpeech.ts` | `normalizeSpeech()`, `isSimilarSpeech()` 함수 추가 |
| `lib/ai.ts` | `generateAiTurnMessagesParallel()`에서 중복 방지 로직 통합 |
| `app/game/page.tsx` | 발화 기록 전달 및 업데이트 |

## 검증 결과

- ✅ `npm.cmd run typecheck` 통과
- ✅ `npm.cmd run lint` 통과 (warning만 존재)
- ✅ `npm.cmd run build` 성공

## 다음 세션 권장 작업

1. 실제 브라우저에서 게임 플레이 테스트
2. 5턴 이상 진행하며 중복 발화 방지 확인
3. 콘솔 로그에서 `[중복감지]`, `[강제생성]` 메시지 확인
4. 필요시 유사도 검사 임계값 조정

## 알려진 제한사항

- 유사도 검사는 휴리스틱 기반 (100% 정확하지 않음)
- 짧은 문장(10자 이하)은 더 엄격하게 검사
- API 응답이 중복이면 fallback으로 전환
- 발화 기록이 많아지면 성능 영향 가능 (최대 100개 유지 권장)
