import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

const links = [
  { href: "/business", label: "서비스 소개", id: "business" },
  { href: "/pricing", label: "요금 안내", id: "pricing" },
  { href: "/terms", label: "이용약관", id: "terms" },
  { href: "/privacy", label: "개인정보처리방침", id: "privacy" },
  { href: "/ai-policy", label: "AI 처리 안내", id: "ai" },
  { href: "/refund-policy", label: "환불 정책", id: "refund" },
] as const;

export function LegalShell({
  current,
  kicker,
  title,
  summary,
  metaLabel = "시행일 2026년 7월 18일",
  statusLabel = "공개 베타 운영 기준",
  children,
}: {
  current: "business" | "pricing" | "terms" | "privacy" | "ai" | "refund";
  kicker: string;
  title: string;
  summary: string;
  metaLabel?: string;
  statusLabel?: string;
  children: ReactNode;
}) {
  return (
    <main className="dm-legal-page">
      <div className="dm-legal-shell">
        <header className="dm-legal-top">
          <Link className="dm-legal-brand" href="/"><Image src="/dangmo-icon.png" alt="" width={32} height={32} priority /><span>당모</span></Link>
          <nav className="dm-legal-nav" aria-label="정책 문서">
            {links.map((link) => <Link key={link.id} href={link.href} aria-current={current === link.id ? "page" : undefined}>{link.label}</Link>)}
          </nav>
        </header>
        <section className="dm-legal-hero">
          <p className="dm-legal-kicker">{kicker}</p>
          <h1>{title}</h1>
          <p className="dm-legal-summary">{summary}</p>
          <div className="dm-legal-meta"><span>{metaLabel}</span><span className="dm-legal-status">{statusLabel}</span></div>
        </section>
        <article className="dm-legal-content">{children}</article>
        <footer className="dm-legal-footer">
          <div><strong>Team. DM · 당모</strong><span>지원사업 탐색부터 신청 준비까지 연결하는 AI 공고 비서</span><span>© 2026 Team. DM. All rights reserved.</span></div>
          <div><span>정책·개인정보 문의</span><a href="mailto:sseung.chip@gmail.com">sseung.chip@gmail.com</a></div>
        </footer>
      </div>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="dm-legal-section"><h2>{title}</h2>{children}</section>;
}
