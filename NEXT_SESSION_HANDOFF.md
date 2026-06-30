# AI 분신 소셜 게임 - 다음 세션 인수인계

마지막 정리일: 2026-06-30

## 새 채팅에서 가장 먼저 할 일

1. 이 파일을 처음부터 끝까지 읽는다.
2. `git status --short`로 커밋되지 않은 랜딩 변경을 확인한다.
3. 현재 요청이 랜딩 작업의 연장인지 사용자에게 받은 새 요청인지 확인한다.
4. 게임·AI·API 로직은 사용자가 명시적으로 요청하지 않는 한 수정하지 않는다.

## 프로젝트

- 경로: `C:\Users\정선우\Desktop\my-ai`
- Next.js 16 App Router / React 18 / TypeScript / Tailwind CSS
- GitHub: `https://github.com/zz221221221-ship-it/my-ai`
- 브랜치: `main`
- 현재 HEAD: `3c48314 Build AI persona social deduction multiplayer MVP`
- Vercel Production: `https://my-ai-phi-vert.vercel.app`
- 루트의 `cafe-tycoon.html`은 별도 게임이므로 수정하지 않는다.

PowerShell에서는 `npm` 대신 `npm.cmd`를 사용한다.

```powershell
npm.cmd run dev
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

현재 사용자가 실행 중인 개발 서버는 `http://localhost:3000`에서 확인됐다. `.env.local`의 OpenRouter referer 설정은 과거 개발 주소인 3001일 수 있으나, 랜딩 작업에서는 변경하지 않았다.

## 보안

- `.env.local`은 Git ignore 상태다.
- 실제 API 키를 코드, 문서, 응답에 출력하지 않는다.
- 필요한 환경변수 이름:

```text
OPENROUTER_API_KEY=<secret>
OPENROUTER_MODEL=<model>
OPENROUTER_SITE_URL=<site-url>
OPENROUTER_APP_NAME=<app-name>
```

- Vercel Production 환경변수는 이미 등록되어 있다.
- API 키는 과거 대화에 노출된 적이 있으므로 운영 전 폐기·재발급 권장.

## 완료되어 GitHub/Vercel에 반영된 기능

- AI 분신 Persona 생성과 카카오톡 전처리
- Persona AI / GM / 결과 리포트
- 추리·생존·정치·연애·드라마 모드
- 중복 발화 방지용 `SpokenLine`, `spokenLineHistory`, `usedSpeechActs`
- `user | ai | system` 메시지 타입
- GM 카드 대신 채팅 내부 system 메시지
- 2초 Polling 기반 멀티플레이 MVP
- 방 생성·참가·준비·방장 설정·턴 제출·AI/GM 1회 실행
- 개인 역할·목표·비밀·비공개 단서 필터링
- OpenRouter 호출은 서버 전용 `app/api/ai/route.ts` → `lib/openrouter.ts` 경계로 유지

## 현재 진행 중인 작업: 랜딩페이지

사용자 요청은 기존 게임을 건드리지 않고 랜딩페이지만 제작하는 것이다.

### 디자인 레퍼런스

- `C:\Users\정선우\Desktop\랜딩페이지 이미지1.png`
- `C:\Users\정선우\Desktop\랜딩페이지 이미지2.png`

이미지를 직접 사용하거나 복제하지 않고 다음 디자인 언어만 참고했다.

- Premium / Minimal / Modern / Monochrome
- 화이트 배경, 연한 Dot Grid, 넓은 여백
- 블랙 타이포그래피, CSS/SVG 픽셀 아이콘
- Desktop First, 최대 폭 약 1440px

### 랜딩 구현 상태

- `/`는 새 랜딩페이지다.
- 기존 홈의 싱글플레이 설정 UI는 `/setup`으로 그대로 옮겨 기능을 보존했다.
- `/lobby` 멀티플레이 진입도 유지한다.
- Hero 최초 상태에는 중앙 사용자 아이콘만 보인다.
- 로드 1.5초 후 AI 분신 5명이 430ms 간격으로 하나씩 등장한다.
- 각 AI 애니메이션은 정확히 `opacity fade + scale(0.8 → 1)`, `400ms`, `ease-in-out`이다.
- Hero 아래에 게임 방법, 게임 특징, 모드 스트립, FAQ, 최종 CTA가 이어진다.
- 상단 메뉴는 `scrollIntoView({ behavior: "smooth" })`로 섹션 이동한다.
- 별도 아이콘 라이브러리나 이미지 에셋은 사용하지 않았다.

### 랜딩 관련 변경 파일

수정:

- `app/page.tsx` — 랜딩 진입점으로 교체
- `app/layout.tsx` — 랜딩용 title/description

신규:

- `app/setup/page.tsx` — 이전 `app/page.tsx` 설정 화면 보존
- `components/landing/LandingPage.tsx` — 랜딩 구조와 Hero 타이머
- `components/landing/landing.module.css` — 랜딩 전용 스타일과 반응형

### 절대 수정하지 않은 영역

- `app/api/**`
- `app/game/**`
- `app/result/**`
- `app/room/**`, `app/rooms/**`
- `lib/**`
- 게임 플레이 컴포넌트
- OpenRouter 및 환경변수

## 현재 Git 상태

랜딩 변경은 아직 커밋·push·배포하지 않았다.

예상 상태:

```text
 M app/layout.tsx
 M app/page.tsx
?? app/setup/
?? components/landing/
```

기존 배포 `https://my-ai-phi-vert.vercel.app`에는 아직 랜딩 변경이 반영되지 않았다.

## 이번 랜딩 검증 결과

- `npm.cmd run typecheck` 통과
- `npm.cmd run lint` 통과
- 기존 실행 중인 dev server에서 다음 경로 HTTP 200 확인:
  - `http://localhost:3000/`
  - `http://localhost:3000/setup`
  - `http://localhost:3000/lobby`
- 서버 렌더 HTML에서 Hero, 게임 방법, 특징, FAQ, `/setup`, `/lobby` 링크 확인
- `git diff` 기준 게임·API·AI 보호 영역 변경 없음
- 인앱 브라우저가 제공되지 않아 실제 스크린샷 기반 시각 QA는 수행하지 못함
- 실행 중인 사용자 dev server를 방해하지 않기 위해 이번 랜딩 수정 후 production build는 별도로 실행하지 않음

## 다음 세션 권장 순서

1. `git status --short` 확인
2. 가능하면 브라우저에서 1440px 데스크톱 Hero 최초 상태와 약 4초 후 최종 상태 확인
3. 390px 모바일 레이아웃 확인
4. 메뉴 smooth scroll과 `/setup`, `/lobby` CTA 확인
5. 필요하면 랜딩 CSS만 미세 조정
6. 사용자 승인 또는 요청이 있으면 `typecheck`, `lint`, `build` 후 commit/push/Vercel 배포

## 추가 개선 후보

- 실제 모바일 기기 시각 QA
- 개인정보 처리 안내/이용약관 링크
- CTA 전환 이벤트 측정
- 사용자별 픽셀 아바타 커스터마이징
