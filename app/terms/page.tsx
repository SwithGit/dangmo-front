import type { Metadata } from "next";
import { LegalSection, LegalShell } from "../legal-shell";

export const metadata: Metadata = { title: "이용약관 | 당모", robots: { index: false, follow: false } };

export default function TermsPage() {
  return (
    <LegalShell current="terms" kicker="SERVICE TERMS" title="이용약관" summary="당모가 제공하는 지원사업 탐색, 맞춤 추천, 사업비 편성, 서류작성 AI와 알림 기능의 이용 기준을 안내합니다.">
      <div className="dm-legal-notice">당모는 Team. DM이 운영하며, 서비스 문의는 sseung.chip@gmail.com으로 접수합니다.</div>
      <LegalSection title="제1조 목적 및 적용 범위"><p>이 약관은 Team. DM(이하 “운영자”)이 제공하는 당모 웹서비스의 이용 조건과 운영자 및 회원의 권리·의무를 정하는 것을 목적으로 합니다.</p></LegalSection>
      <LegalSection title="제2조 계정과 로그인"><ol><li>회원은 Google 또는 카카오 등 제공되는 소셜 로그인을 통해 계정을 생성할 수 있습니다.</li><li>회원은 본인의 계정과 로그인 수단을 안전하게 관리해야 하며, 제3자에게 이용하게 해서는 안 됩니다.</li><li>외부 로그인 제공자의 장애나 정책 변경에 따라 로그인이 일시 제한될 수 있습니다.</li></ol></LegalSection>
      <LegalSection title="제3조 제공 기능"><ul><li>지원사업 공고 탐색, 저장, 자격조건 및 적합도 정보 제공</li><li>사용자가 등록한 공개 공고 목록의 변경 확인</li><li>사업자료 업로드 및 AI 사업 프로필 생성</li><li>사업비 편성, 신청서 초안 작성 및 버전 관리</li><li>공지사항과 익명 커뮤니티 게시글·댓글</li><li>마감일·준비상태·맞춤 공고 알림</li><li>계정 데이터 내보내기 및 삭제</li></ul><p>베타 기간에는 기능의 일부가 변경·중단되거나 이용량 제한이 적용될 수 있습니다.</p></LegalSection>
      <LegalSection title="제4조 공고 정보와 외부 링크"><p>당모는 K-Startup, 기업마당 등 공식 출처의 정보를 수집·정리하지만, 공고의 최종 자격조건·제출방법·일정은 반드시 원문과 주관기관 안내를 확인해야 합니다. 외부 사이트의 내용이나 이용 결과는 해당 운영 주체의 책임 범위에 따릅니다.</p></LegalSection>
      <LegalSection title="제5조 AI 결과의 성격"><ol><li>AI 분석·추천·초안은 의사결정을 돕는 보조 정보이며 선정, 지원 자격 또는 제출 결과를 보장하지 않습니다.</li><li>회원은 허위 사실, 과장된 실적 또는 권리를 침해하는 자료를 입력해서는 안 됩니다.</li><li>AI 결과에 포함된 수치·사실·자격요건은 제출 전에 회원이 직접 검토하고 수정해야 합니다.</li></ol></LegalSection>
      <LegalSection title="제5조의2 사용자 추가 공고 출처"><p>이용자는 로그인 없이 공개된 HTTPS 공고 목록만 등록할 수 있으며, 해당 사이트의 이용조건과 robots.txt 등 자동 수집 허용 범위를 확인해야 합니다. 로그인·캡차·접근 제한을 우회하는 수집은 지원하지 않습니다.</p></LegalSection>
      <LegalSection title="제5조의3 커뮤니티 이용"><ol><li>대나무숲의 게시글과 댓글은 다른 이용자에게 익명으로 표시되지만, 작성자는 자신의 게시물에 대한 책임을 부담합니다.</li><li>개인정보, 광고, 비방, 불법 정보, 타인의 권리를 침해하는 내용 또는 서비스 운영을 방해하는 게시물은 제한될 수 있습니다.</li><li>부정 이용 방지와 이용자 권리 처리를 위해 게시글·댓글은 작성 계정과 연결하여 저장되며 회원 탈퇴 시 삭제됩니다.</li></ol></LegalSection>
      <LegalSection title="제6조 회원의 의무"><p>회원은 관계 법령, 이 약관, 공고 주관기관의 규정과 안내를 준수해야 합니다. 서비스의 정상 운영을 방해하거나 타인의 개인정보·영업비밀·저작권을 침해하는 방식으로 이용할 수 없습니다.</p></LegalSection>
      <LegalSection title="제7조 이용 제한 및 서비스 변경"><p>보안 위협, 비정상적인 자동 요청, 권리 침해, 시스템 점검 또는 외부 공급자 장애가 발생한 경우 운영자는 필요한 범위에서 이용을 제한할 수 있습니다. 중요한 변경은 서비스 화면 또는 등록된 연락수단으로 안내합니다.</p></LegalSection>
      <LegalSection title="제8조 책임의 범위"><p>운영자는 합리적인 범위에서 서비스의 정확성과 안정성을 유지합니다. 다만 천재지변, 외부 API·통신망 장애, 회원의 입력 오류, 공고기관의 변경 등 운영자가 통제하기 어려운 사유로 발생한 손해에 대해서는 관련 법령이 허용하는 범위에서 책임이 제한될 수 있습니다.</p></LegalSection>
      <LegalSection title="제8조의2 유료 플랜과 크레딧"><ol><li>유료 플랜은 결제 완료 시점부터 30일 동안 제공되는 일회성 이용권이며, 추가 크레딧도 일회성 상품입니다. 가격, 지급량과 사용 조건은 결제 전 화면에 표시합니다.</li><li>30일 이용권은 자동 결제 또는 자동 갱신되지 않습니다. 이용 기간이 끝난 뒤 계속 이용하려면 회원이 직접 새 이용권을 결제해야 합니다.</li><li>프로모션 쿠폰은 코드별 지급량·유효기간·사용 횟수 조건에 따르며 현금으로 교환할 수 없습니다.</li></ol></LegalSection>
      <LegalSection title="제8조의3 청약철회와 환불"><p>유료 서비스의 청약철회와 환불은 관계 법령 및 <a href="/refund-policy">환불 및 30일 이용권 정책</a>에 따릅니다. 결제 후 7일 이내이고 지급된 유료 크레딧 또는 디지털 서비스 이용을 시작하지 않은 경우 결제 내역에서 전액 환불 검토를 요청할 수 있습니다.</p></LegalSection>
      <LegalSection title="제9조 탈퇴 및 데이터 삭제"><p>회원은 내 프로필 최하단에서 회원 탈퇴를 요청할 수 있습니다. 탈퇴 시 계정에 연결된 사업자료, 프로필, 저장 공고, 사업비, 초안, 커뮤니티 게시글·댓글과 알림 정보가 삭제되며 복구할 수 없습니다.</p></LegalSection>
      <LegalSection title="제10조 문의 및 분쟁 처리"><p>약관과 서비스 이용 문의는 <a href="mailto:sseung.chip@gmail.com">sseung.chip@gmail.com</a>으로 접수합니다. 분쟁이 발생한 경우 운영자와 회원은 성실히 협의하며, 해결되지 않는 경우 대한민국 법령과 관할 법원의 절차를 따릅니다.</p></LegalSection>
    </LegalShell>
  );
}
