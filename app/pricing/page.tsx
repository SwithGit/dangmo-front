import type { Metadata } from "next";
import Link from "next/link";
import { LegalSection, LegalShell } from "../legal-shell";

export const metadata: Metadata = {
  title: "요금 안내 | 당모",
  description: "당모 무료·Start·Pro 30일 이용권과 AI 크레딧 가격, 수동 갱신 및 환불 기준을 확인하세요.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <LegalShell current="pricing" kicker="PLANS & CREDITS" title="요금 안내" summary="직접 작성은 무료로 유지하고, AI 초안·피드백·추가 프로필과 맞춤 알림이 필요할 때 30일 이용권 또는 크레딧을 선택할 수 있습니다.">
      <div className="dm-legal-notice">모든 가격은 원화 기준입니다. Start·Pro는 자동 구독이 아닌 30일 단건 이용권이며, 만료 후 계속 이용하려면 직접 다시 결제해야 합니다.</div>
      <LegalSection title="수동 갱신형 30일 이용권">
        <table className="dm-legal-table"><thead><tr><th>플랜</th><th>가격</th><th>포함 크레딧</th><th>주요 기능</th></tr></thead><tbody>
          <tr><th>Free</th><td>0원</td><td>가입 10 + 매일 1</td><td>공고 탐색, 직접 작성, AI 사업 프로필 1개</td></tr>
          <tr><th>Start</th><td>19,900원 / 30일</td><td>구매 시 120</td><td>AI 초안·피드백, 프로필 최대 2개, 맞춤 공고 이메일, D-7·D-3·D-1 알림</td></tr>
          <tr><th>Pro</th><td>39,900원 / 30일</td><td>구매 시 360</td><td>AI 초안·피드백 확대, 프로필 최대 5개, 즉시 맞춤 공고 이메일, D-14·D-7·D-3·D-1 진단</td></tr>
        </tbody></table>
        <p>이용권 만료 D-7·D-3·D-1에 계정 이메일로 갱신 안내를 보냅니다. 별도 해지 절차와 자동 결제는 없습니다.</p>
      </LegalSection>
      <LegalSection title="일회성 AI 크레딧">
        <table className="dm-legal-table"><thead><tr><th>상품</th><th>가격</th><th>결제 주기</th></tr></thead><tbody>
          <tr><th>AI 크레딧 100</th><td>15,900원</td><td>일회성</td></tr>
          <tr><th>AI 크레딧 300</th><td>39,900원</td><td>일회성</td></tr>
          <tr><th>AI 크레딧 700</th><td>79,900원</td><td>일회성</td></tr>
        </tbody></table>
        <p>구매한 크레딧은 AI 프로필 분석, 서류 초안 생성과 피드백을 실행할 때만 차감됩니다. 직접 작성·수정·저장 기능은 크레딧을 사용하지 않습니다.</p>
      </LegalSection>
      <LegalSection title="결제·환불·문의">
        <p>결제와 결제수단 인증은 PortOne 결제창에서 진행됩니다. 현금영수증·매출전표와 환불 기준은 결제 내역과 <Link href="/refund-policy">환불 및 30일 이용권 정책</Link>에서 확인할 수 있습니다.</p>
        <p>결제 문의: <a href="mailto:sseung.chip@gmail.com">sseung.chip@gmail.com</a></p>
        <p><Link href="/">당모에서 시작하기 →</Link></p>
      </LegalSection>
    </LegalShell>
  );
}
