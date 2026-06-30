"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./landing.module.css";

const NAV_ITEMS = [
  { label: "게임 소개", target: "intro" },
  { label: "특징", target: "features" },
  { label: "플레이 방법", target: "how-to-play" },
  { label: "FAQ", target: "faq" }
];

const AI_CLONES = [
  { id: "01", name: "눈치 빠른 나", position: styles.cloneOne },
  { id: "02", name: "차분한 친구", position: styles.cloneTwo },
  { id: "03", name: "솔직한 나", position: styles.cloneThree },
  { id: "04", name: "장난스런 친구", position: styles.cloneFour },
  { id: "05", name: "신중한 나", position: styles.cloneFive }
];

const HOW_TO_PLAY = [
  { number: "01", icon: "profile", title: "분신을 만드세요", description: "대화와 성격을 바탕으로 나를 닮은 AI 분신이 탄생합니다." },
  { number: "02", icon: "people", title: "친구를 초대하세요", description: "혼자 시작하거나 친구의 분신과 같은 방에서 만납니다." },
  { number: "03", icon: "chat", title: "사건에 반응하세요", description: "각자의 기억과 말투로 대화하며 관계와 상황을 바꿉니다." },
  { number: "04", icon: "search", title: "진실을 추리하세요", description: "말 속의 모순과 공개된 단서를 연결해 선택을 내립니다." },
  { number: "05", icon: "report", title: "결말을 확인하세요", description: "선택이 만든 엔딩과 AI가 분석한 플레이 스타일을 봅니다." }
] as const;

const FEATURES = [
  { icon: "memory", tag: "PERSONA 01", title: "당신만의 AI 분신", description: "문장 길이부터 웃음 표현까지, 평소 대화 습관을 학습해 실제 나처럼 반응합니다." },
  { icon: "chat", tag: "CHAT 02", title: "살아 있는 단체 대화", description: "AI는 설명하지 않습니다. 친구처럼 묻고, 서운해하고, 의심하며 대화에 참여합니다." },
  { icon: "people", tag: "SOCIAL 03", title: "함께 만드는 관계극", description: "추리·연애·정치·생존 모드에서 나와 친구의 분신이 전혀 다른 선택을 만듭니다." },
  { icon: "chart", tag: "REPORT 04", title: "선택을 읽는 리포트", description: "게임이 끝나면 관계 변화, 결정적인 선택과 AI 분신 일치율을 한눈에 확인합니다." }
] as const;

const FAQS = [
  { question: "AI 분신은 어떻게 만들어지나요?", answer: "카카오톡 대화 또는 AI가 분석한 프로필을 넣으면 말투, 감정 표현, 질문 습관과 관계 행동을 게임용 분신으로 구성합니다." },
  { question: "친구와 동시에 플레이할 수 있나요?", answer: "네. 6자리 방 코드나 초대 링크로 참가할 수 있고, 사람과 AI를 합쳐 최대 6명이 같은 사건을 플레이합니다." },
  { question: "어떤 게임 모드가 있나요?", answer: "추리, 연애, 드라마, 정치, 생존 모드를 지원합니다. 장르는 상황을 바꾸고, AI 분신의 고유한 말투는 그대로 유지됩니다." },
  { question: "업로드한 대화는 어디에 사용되나요?", answer: "대화는 AI 분신의 말투와 행동 프로필을 만드는 데 사용됩니다. 실제 서비스 운영 전에는 별도의 개인정보 정책과 보관 기준을 마련하는 것을 권장합니다." }
];

type IconName = typeof HOW_TO_PLAY[number]["icon"] | typeof FEATURES[number]["icon"];

function scrollToSection(target: string) {
  document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function PixelAvatar({ ai = false }: { ai?: boolean }) {
  return (
    <svg viewBox="0 0 64 80" aria-hidden="true" className={styles.avatarSvg} shapeRendering="crispEdges">
      {ai ? (
        <>
          <path d="M30 2h4v8h-4zM26 0h12v4H26z" fill="currentColor" />
          <path d="M14 14h36v30H14zM18 18v22h28V18z" fill="currentColor" fillRule="evenodd" />
          <path d="M22 26h6v6h-6zM36 26h6v6h-6zM26 36h12v4H26z" fill="currentColor" />
        </>
      ) : (
        <>
          <path d="M18 12h28v8H18zM14 20h36v22H14zM18 42h28v6H18z" fill="currentColor" />
          <path d="M18 22h28v18H18z" fill="white" />
          <path d="M22 28h5v5h-5zM37 28h5v5h-5zM27 36h10v3H27z" fill="currentColor" />
          <path d="M14 16h8v6h-8zM42 16h8v6h-8z" fill="currentColor" />
        </>
      )}
      <path d="M18 48h28v8H18zM12 56h40v8H12zM12 64h10v16H12zM42 64h10v16H42zM26 64h12v16H26z" fill="currentColor" />
      {ai && <path d="M26 54h4v4h-4zM34 54h4v4h-4z" fill="white" />}
    </svg>
  );
}

function PixelIcon({ name }: { name: IconName }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "square" as const, strokeLinejoin: "miter" as const };
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={styles.pixelIcon} shapeRendering="crispEdges">
      {name === "profile" && <><rect x="14" y="5" width="20" height="17" {...common} /><path d="M18 9h12M20 15h2m4 0h2M16 28h16v15H16zM10 32h6m16 0h6" {...common} /></>}
      {name === "people" && <><circle cx="24" cy="12" r="6" {...common} /><circle cx="10" cy="20" r="5" {...common} /><circle cx="38" cy="20" r="5" {...common} /><path d="M15 39v-9c0-5 4-8 9-8s9 3 9 8v9M3 40v-10c0-4 3-6 7-6m35 16V30c0-4-3-6-7-6" {...common} /></>}
      {name === "chat" && <><path d="M6 8h36v25H20l-9 8v-8H6z" {...common} /><path d="M14 20h4m4 0h4m4 0h4" {...common} /></>}
      {name === "search" && <><circle cx="20" cy="20" r="13" {...common} /><path d="M29 29l13 13M15 17h10m-10 6h6" {...common} /></>}
      {name === "report" && <><path d="M6 42h36M10 42V29h7v13m5 0V18h7v24m5 0V8h7v34" {...common} /></>}
      {name === "memory" && <><path d="M10 8h24l6 6v26H10zM34 8v8h8" {...common} /><path d="M17 24h4m6 0h6M17 31h16" {...common} /></>}
      {name === "chart" && <><path d="M6 42h36M10 42V31h6v11m5 0V22h6v20m5 0V12h6v30" {...common} /><path d="M9 17l10-7 9 5 11-9" {...common} /></>}
    </svg>
  );
}

export default function LandingPage() {
  const [visibleClones, setVisibleClones] = useState(0);

  useEffect(() => {
    const timers = AI_CLONES.map((_, index) => window.setTimeout(() => setVisibleClones(index + 1), 1500 + index * 430));
    return () => timers.forEach(window.clearTimeout);
  }, []);

  return (
    <main className={styles.landing}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand} aria-label="AI 분신 소셜 게임 홈">
            <span className={styles.brandMark} aria-hidden="true" />
            AI 분신 소셜 게임
          </Link>
          <nav className={styles.nav} aria-label="랜딩페이지 메뉴">
            {NAV_ITEMS.map((item) => (
              <button key={item.target} type="button" onClick={() => scrollToSection(item.target)}>{item.label}</button>
            ))}
          </nav>
          <Link href="/setup" className={styles.headerCta}>게임 시작</Link>
        </div>
      </header>

      <section id="intro" className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><span /> AI PERSONA SOCIAL PLAY</p>
          <h1>AI 분신<br />소셜 게임</h1>
          <p className={styles.heroDescription}>
            당신과 똑같은 AI 분신과 같이 놀 수 있습니다.<br />
            심지어 친구의 AI 분신과 같이 놀 수 있습니다.
          </p>
          <div className={styles.heroActions}>
            <Link href="/setup" className={styles.primaryButton}>나의 분신 만들기 <span>↗</span></Link>
            <Link href="/lobby" className={styles.secondaryButton}>친구와 시작하기</Link>
          </div>
          <p className={styles.heroMeta}>01—06 PLAYERS&nbsp;&nbsp;·&nbsp;&nbsp;05 STORY MODES</p>
        </div>

        <div className={styles.heroVisual} aria-label="한 사람 주위로 다섯 AI 분신이 순서대로 나타나는 모습">
          <div className={`${styles.orbit} ${styles.orbitOuter}`} />
          <div className={`${styles.orbit} ${styles.orbitMiddle}`} />
          <div className={`${styles.orbit} ${styles.orbitInner}`} />
          <div className={styles.centerNode}>
            <span className={styles.youLabel}>YOU / ORIGINAL</span>
            <PixelAvatar />
          </div>
          <div className={styles.pixelSpark} aria-hidden="true"><i /><i /><i /></div>
          {AI_CLONES.map((clone, index) => (
            <div
              key={clone.id}
              className={`${styles.cloneNode} ${clone.position} ${index < visibleClones ? styles.cloneVisible : ""}`}
              aria-hidden={index >= visibleClones}
            >
              <span className={styles.cloneNumber}>AI—{clone.id}</span>
              <PixelAvatar ai />
              <span className={styles.cloneName}>{clone.name}</span>
            </div>
          ))}
          <p className={styles.networkStatus}><span /> PERSONA NETWORK&nbsp;&nbsp;{String(visibleClones).padStart(2, "0")} / 05</p>
        </div>
      </section>

      <section id="how-to-play" className={styles.section}>
        <div className={styles.sectionHeading}>
          <p className={styles.sectionIndex}>01 / HOW TO PLAY</p>
          <h2>다섯 단계면<br />이야기가 시작됩니다.</h2>
          <p>설정은 짧게, 대화와 선택은 깊게.<br />분신마다 다른 기억과 성격으로 사건에 참여합니다.</p>
        </div>
        <div className={styles.steps}>
          {HOW_TO_PLAY.map((step) => (
            <article key={step.number} className={styles.stepCard}>
              <span className={styles.stepNumber}>{step.number}</span>
              <PixelIcon name={step.icon} />
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="features" className={`${styles.section} ${styles.featureSection}`}>
        <div className={styles.sectionHeading}>
          <p className={styles.sectionIndex}>02 / FEATURES</p>
          <h2>캐릭터가 아니라,<br />당신을 복제합니다.</h2>
          <p>장르보다 사람을 먼저 기억하는 AI.<br />그래서 같은 사건도 전혀 다른 대화가 됩니다.</p>
        </div>
        <div className={styles.featureGrid}>
          {FEATURES.map((feature) => (
            <article key={feature.tag} className={styles.featureCard}>
              <div className={styles.featureTop}><PixelIcon name={feature.icon} /><span>{feature.tag}</span></div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.modeStrip} aria-label="게임 모드">
        <span>DEDUCTION</span><i />
        <span>ROMANCE</span><i />
        <span>DRAMA</span><i />
        <span>POLITICS</span><i />
        <span>SURVIVAL</span>
      </section>

      <section id="faq" className={`${styles.section} ${styles.faqSection}`}>
        <div className={styles.sectionHeading}>
          <p className={styles.sectionIndex}>03 / FAQ</p>
          <h2>시작하기 전에<br />궁금한 것들.</h2>
        </div>
        <div className={styles.faqList}>
          {FAQS.map((item, index) => (
            <details key={item.question} className={styles.faqItem}>
              <summary><span>{String(index + 1).padStart(2, "0")}</span>{item.question}<i>+</i></summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.finalCta}>
        <p>YOUR PERSONA IS READY</p>
        <h2>나를 닮은 AI와<br />첫 번째 사건을 시작하세요.</h2>
        <div>
          <Link href="/setup" className={styles.primaryButton}>혼자 플레이하기 <span>↗</span></Link>
          <Link href="/lobby" className={styles.secondaryButton}>친구와 플레이하기</Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>AI 분신 소셜 게임</span>
        <span>PERSONA / STORY / SOCIAL</span>
        <span>© 2026</span>
      </footer>
    </main>
  );
}
