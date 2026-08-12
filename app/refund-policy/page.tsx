import type { Metadata } from "next";
import { LegalSection, LegalShell } from "../legal-shell";

export const metadata: Metadata = { title: "환불 및 30일 이용권 정책 | 당모" };

export default function RefundPolicyPage() {
  return (
    <LegalShell current="refund" kicker="BILLING & REFUNDS" title="환불 및 30일 이용권 정책" summary="PortOne으로 결제한 당모 30일 이용권과 크레딧의 만료·환불 요청 기준과 처리 절차를 안내합니다.">
      <div className="dm-legal-notice">이 정책은 PortOne을 통해 결제한 당모 30일 이용권과 일회성 크레딧에 적용됩니다. 관계 법령 또는 소비자에게 더 유리한 기준이 있는 경우 해당 기준을 우선합니다.</div>
      <LegalSection title="1. 이용권 만료와 수동 갱신"><ol><li>Start와 Pro는 결제 완료 시점부터 30일 동안 제공되는 일회성 이용권입니다.</li><li>자동 결제나 자동 갱신은 없으며, 별도 해지 절차 없이 이용 기간이 끝나면 Free 플랜으로 전환됩니다.</li><li>만료 D-7·D-3·D-1에 등록 이메일로 안내하며, 계속 이용하려면 회원이 직접 새 30일 이용권을 결제해야 합니다.</li></ol></LegalSection>
      <LegalSection title="2. 청약철회 및 전액 환불 요청"><ol><li>결제일 또는 디지털 서비스 공급 개시일 중 늦은 날부터 7일 이내에 환불을 요청할 수 있습니다.</li><li>지급된 유료 크레딧으로 AI 초안·피드백·프로필 분석 등 디지털 서비스 이용을 시작하지 않은 경우 전액 환불 검토 대상입니다.</li><li>환불 제한 사유와 디지털 콘텐츠 제공 개시 사실은 결제 전 화면에서 확인할 수 있도록 안내합니다.</li></ol></LegalSection>
      <LegalSection title="3. 사용 후 환불"><p>유료 크레딧 또는 30일 이용권 기능을 이미 사용한 경우 자동 전액 환불 대상에서 제외될 수 있습니다. 다만 서비스 장애, 중복 결제, 표시·계약 내용과 다른 제공 등 운영자 책임 사유가 있는 경우 사용 내역과 관계 법령을 확인해 전액 또는 일부 환불합니다.</p></LegalSection>
      <LegalSection title="4. 처리 절차"><ol><li>회원이 결제 내역에서 결제 건과 사유를 선택해 환불 검토를 요청합니다.</li><li>운영자가 결제일, 크레딧 사용 여부, 중복 결제 및 장애 이력을 확인합니다.</li><li>승인 시 PortOne을 통해 원 결제 취소를 요청하며, 승인된 결과를 확인한 후 환불 완료로 표시합니다.</li><li>카드사와 결제수단에 따라 실제 환급 반영까지 추가 영업일이 걸릴 수 있습니다.</li></ol></LegalSection>
      <LegalSection title="5. 문의"><p>자동 요청 조건을 충족하지 않거나 부분 환불 상담이 필요한 경우 결제 이메일, 결제일, 요청 사유를 적어 <a href="mailto:sseung.chip@gmail.com">sseung.chip@gmail.com</a>으로 문의해주세요.</p></LegalSection>
      <LegalSection title="6. 법령과 정책 변경"><p>전자상거래법 등 관계 법령, 소비자분쟁해결기준 또는 결제사의 운영 정책이 변경되면 이 정책도 변경될 수 있습니다. 중요한 변경은 시행 전에 서비스 화면으로 안내합니다.</p></LegalSection>
    </LegalShell>
  );
}
