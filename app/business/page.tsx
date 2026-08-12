import type { Metadata } from "next";
import Link from "next/link";
import { LegalSection, LegalShell } from "../legal-shell";

export const metadata: Metadata = {
  title: "서비스 및 비즈니스 모델 | 당모",
  description: "당모가 제공하는 지원사업 탐색·AI 신청 준비 서비스와 무료·유료 기능, 가격, 결제 및 제공 방식을 안내합니다.",
  alternates: { canonical: "/business" },
  openGraph: {
    title: "당모 서비스 및 비즈니스 모델",
    description: "지원사업 탐색부터 신청 준비까지 연결하는 AI 공고 비서 당모의 서비스와 판매 상품을 확인하세요.",
    url: "https://dangmo.kr/business",
  },
};

const features = [
  { number: "01", title: "지원사업 통합 탐색", body: "K-Startup·기업마당 등 여러 기관의 공고를 한곳에서 검색하고 원문까지 연결합니다." },
  { number: "02", title: "AI 프로필 기반 추천", body: "사업계획서·IR 자료를 분석한 사업 프로필과 공고 조건을 비교해 맞춤 공고를 제안합니다." },
  { number: "03", title: "사업비 편성", body: "지원금·현금 부담금·현물 부담금의 비목과 세목을 나누고 금액·비율·잔액을 계산합니다." },
  { number: "04", title: "서류작성 AI", body: "사용자가 직접 작성한 내용을 바탕으로 AI 초안과 항목별 피드백을 제공해 신청 준비를 돕습니다." },
];

const steps = [
  ["사업 정보 등록", "창업 연차·업종·지역을 입력하고 필요하면 사업계획서 또는 IR 자료를 추가합니다."],
  ["프로필 선택", "AI가 분석한 사업 프로필 중 공고 추천과 서류 작성에 사용할 프로필을 선택합니다."],
  ["공고 탐색·준비", "공고 원문과 주요 조건을 확인하고 저장한 뒤 사업비와 신청 서류를 준비합니다."],
  ["AI 사용·알림", "필요한 순간에 크레딧으로 AI 초안·피드백을 실행하고 30일 이용권의 맞춤 이메일과 D-day 알림을 받습니다."],
];

export default function BusinessPage() {
  return (
    <LegalShell
      current="business"
      kicker="SERVICE & BUSINESS MODEL"
      title="당모 서비스 및 비즈니스 모델"
      summary="당모는 흩어진 지원사업 공고를 발견하는 순간부터 사업비 편성, 서류 작성, 제출 일정 관리까지 이어주는 웹 기반 AI 공고 비서입니다."
      metaLabel="운영 주체 Team. DM"
      statusLabel="웹 기반 SaaS · 디지털 서비스"
    >
      <section className="dm-business-lead" aria-label="서비스 핵심 정보">
        <div>
          <span>서비스 대상</span>
          <strong>예비·초기·도약 창업자와 소규모 사업팀</strong>
        </div>
        <div>
          <span>제공 방식</span>
          <strong>결제 후 계정에 즉시 적용되는 웹 서비스</strong>
        </div>
        <div>
          <span>수익 모델</span>
          <strong>수동 갱신형 30일 이용권 + 일회성 AI 크레딧</strong>
        </div>
      </section>

      <div className="dm-business-actions">
        <Link className="dm-business-primary" href="/pricing">요금과 상품 확인</Link>
        <Link className="dm-business-secondary" href="/">서비스 둘러보기</Link>
      </div>

      <LegalSection title="1. 해결하려는 문제와 제공 가치">
        <p>창업자는 기관마다 흩어진 공고를 반복해서 찾아야 하고, 복잡한 자격조건과 사업비 기준을 확인하면서 제한된 시간 안에 신청서를 준비해야 합니다. 당모는 이 과정을 하나의 작업 흐름으로 연결해 탐색과 준비에 드는 시간을 줄입니다.</p>
        <div className="dm-business-feature-grid">
          {features.map((feature) => (
            <article key={feature.number}>
              <span>{feature.number}</span>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
        <div className="dm-legal-notice">당모의 공고 요약, 적합도, AI 초안과 피드백은 신청 준비를 돕는 참고 정보입니다. 최종 자격, 제출 서류, 마감 시각과 선정 여부는 보장하지 않으며 사용자가 반드시 기관 공고 원문을 확인해야 합니다.</div>
      </LegalSection>

      <LegalSection title="2. 이용 흐름">
        <ol className="dm-business-steps">
          {steps.map(([title, body], index) => (
            <li key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><strong>{title}</strong><p>{body}</p></div>
            </li>
          ))}
        </ol>
      </LegalSection>

      <LegalSection title="3. 무료 기능과 유료 기능">
        <table className="dm-legal-table dm-business-table"><thead><tr><th>구분</th><th>무료 제공</th><th>유료 제공</th></tr></thead><tbody>
          <tr><th>공고·작성</th><td>전체 공고 탐색, 공고 원문 확인, 사업비·서류 카드 직접 작성</td><td>AI 프로필 기반 서류 초안 생성 및 항목별 피드백</td></tr>
          <tr><th>AI 사업 프로필</th><td>기본 프로필 1개</td><td>Start 최대 2개, Pro 최대 5개 및 추가 분석</td></tr>
          <tr><th>추천·알림</th><td>기본 맞춤 추천과 웹 알림</td><td>맞춤 공고 이메일, D-day 기반 준비 알림 및 누락 진단</td></tr>
          <tr><th>AI 사용량</th><td>가입 10 크레딧 + 매일 1 무료 크레딧</td><td>30일 이용권 포함 크레딧 또는 일회성 추가 크레딧</td></tr>
        </tbody></table>
        <p>직접 작성·수정·저장 기능은 무료입니다. 크레딧은 AI 분석, 초안 생성과 피드백을 사용자가 직접 실행할 때 차감됩니다.</p>
      </LegalSection>

      <LegalSection title="4. 판매 상품과 가격">
        <table className="dm-legal-table dm-business-table"><thead><tr><th>상품</th><th>가격·주기</th><th>제공 내용</th></tr></thead><tbody>
          <tr><th>Free</th><td>0원</td><td>가입 10 + 매일 1 크레딧, AI 프로필 1개, 직접 작성</td></tr>
          <tr><th>Start 30일 이용권</th><td>19,900원 · 30일</td><td>구매 시 120 크레딧, AI 프로필 최대 2개, 맞춤 이메일과 D-7·D-3·D-1 알림</td></tr>
          <tr><th>Pro 30일 이용권</th><td>39,900원 · 30일</td><td>구매 시 360 크레딧, AI 프로필 최대 5개, 즉시 맞춤 이메일과 D-14·D-7·D-3·D-1 진단</td></tr>
          <tr><th>AI 크레딧 100</th><td>15,900원 · 일회성</td><td>AI 작업용 크레딧 100 지급</td></tr>
          <tr><th>AI 크레딧 300</th><td>39,900원 · 일회성</td><td>AI 작업용 크레딧 300 지급</td></tr>
          <tr><th>AI 크레딧 700</th><td>79,900원 · 일회성</td><td>AI 작업용 크레딧 700 지급</td></tr>
        </tbody></table>
        <p>모든 가격은 원화 기준입니다. 실제 청구 금액과 지원 결제수단은 PortOne 결제창에서 결제 전에 최종 확인할 수 있습니다. 상세 비교는 <Link href="/pricing">요금 안내</Link>에서 제공합니다.</p>
      </LegalSection>

      <LegalSection title="5. 결제·서비스 제공·이용권 관리">
        <div className="dm-business-policy-grid">
          <article><span>PAYMENT</span><h3>PortOne 단건결제</h3><p>30일 이용권과 AI 크레딧은 PortOne 결제창을 통한 일회성 결제로 처리됩니다.</p></article>
          <article><span>DELIVERY</span><h3>즉시 디지털 제공</h3><p>결제 완료가 확인되면 해당 계정에 플랜 권한 또는 구매 크레딧이 즉시 반영됩니다. 배송되는 실물 상품은 없습니다.</p></article>
          <article><span>RENEWAL</span><h3>자동 갱신 없음</h3><p>Start와 Pro는 결제일로부터 30일 동안 제공되고 자동으로 재결제되지 않습니다.</p></article>
          <article><span>REMINDER</span><h3>만료 전 갱신 안내</h3><p>만료 D-7·D-3·D-1에 등록 이메일로 안내하며, 계속 이용하려면 사용자가 직접 다시 결제합니다.</p></article>
        </div>
        <p>결제일 또는 디지털 서비스 공급 개시일 중 늦은 날부터 7일 이내이고 지급된 유료 크레딧 또는 유료 기능을 사용하지 않은 경우 전액 환불 검토를 요청할 수 있습니다. 사용 후 환불과 예외 기준은 <Link href="/refund-policy">환불 및 30일 이용권 정책</Link>을 따릅니다.</p>
      </LegalSection>

      <LegalSection title="6. 운영 정보와 고객 지원">
        <dl className="dm-business-operator">
          <div><dt>서비스명</dt><dd>당모-당신의 사업공모</dd></div>
          <div><dt>운영 주체</dt><dd>Team. DM</dd></div>
          <div><dt>서비스 형태</dt><dd>웹 기반 SaaS·디지털 서비스</dd></div>
          <div><dt>개인정보 보호책임자</dt><dd>백승훈</dd></div>
          <div><dt>고객 문의</dt><dd><a href="mailto:sseung.chip@gmail.com">sseung.chip@gmail.com</a></dd></div>
          <div><dt>서비스 URL</dt><dd><a href="https://dangmo.kr">https://dangmo.kr</a></dd></div>
        </dl>
        <nav className="dm-business-policy-links" aria-label="정책 바로가기">
          <Link href="/terms">이용약관</Link>
          <Link href="/privacy">개인정보처리방침</Link>
          <Link href="/refund-policy">환불 및 30일 이용권 정책</Link>
          <Link href="/ai-policy">AI 처리 안내</Link>
        </nav>
      </LegalSection>
    </LegalShell>
  );
}
