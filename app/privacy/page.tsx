import type { Metadata } from "next";
import { LegalSection, LegalShell } from "../legal-shell";

export const metadata: Metadata = { title: "개인정보처리방침 | 당모", robots: { index: false, follow: false } };

export default function PrivacyPage() {
  return (
    <LegalShell current="privacy" kicker="PRIVACY" title="개인정보처리방침" summary="당모가 어떤 정보를 수집하고 어디에 사용하며, 이용자가 자신의 자료를 어떻게 관리할 수 있는지 안내합니다.">
      <div className="dm-legal-notice">운영 주체는 Team. DM이며, 개인정보 보호책임자는 백승훈입니다. 개인정보 문의는 sseung.chip@gmail.com으로 접수합니다.</div>
      <LegalSection title="1. 처리하는 개인정보">
        <table className="dm-legal-table"><tbody>
          <tr><th>로그인</th><td>이메일 주소, 표시 이름, 로그인 제공자, 제공자 내부 식별자, 로그인 세션 정보</td></tr>
          <tr><th>서비스 이용</th><td>사업자료 파일, AI 사업 프로필, 저장 공고, 사용자가 추가한 공고 출처 URL, 사업비 편성, 신청서 초안, 커뮤니티 게시글·댓글, 알림 설정과 AI 사용량</td></tr>
          <tr><th>운영·보안</th><td>주요 데이터 작업 유형, 대상, 처리 시각, 오류 및 보안 감사 기록</td></tr>
          <tr><th>서비스 분석</th><td>Google Analytics 4가 수집하는 방문 페이지, 유입 경로, 기기·브라우저 정보, 서비스 이용 이벤트와 쿠키 기반 식별자. 이메일·사업자료 내용은 분석 이벤트로 전송하지 않음</td></tr>
        </tbody></table>
        <p>결제수단과 청구 정보는 PortOne 결제창과 연결된 결제대행사에서 처리됩니다. 당모는 전체 카드번호나 정기결제용 빌링키를 저장하지 않으며, 결제·환불·30일 이용권 운영에 필요한 결제 식별자, 주문번호, 상품, 금액과 상태만 계정에 연결해 보관합니다.</p>
      </LegalSection>
      <LegalSection title="2. 처리 목적"><ul><li>회원 식별과 계정별 작업공간 제공</li><li>사업자료 분석, 맞춤 공고 추천, 사업비 및 신청서 작성 지원</li><li>익명 커뮤니티 게시글·댓글 제공과 부정 이용 방지</li><li>공고 마감과 준비상태 알림</li><li>방문 경로와 기능 이용 흐름 분석을 통한 서비스 개선</li><li>오류 대응, 보안과 서비스 개선</li><li>탈퇴, 내보내기 등 이용자 권리 요청 처리</li></ul></LegalSection>
      <LegalSection title="3. 보유 및 이용 기간">
        <table className="dm-legal-table"><tbody>
          <tr><th>계정 데이터</th><td>회원 탈퇴 또는 이용 목적 달성 시까지</td></tr>
          <tr><th>OAuth 요청정보</th><td>로그인 요청 후 약 10분</td></tr>
          <tr><th>로그인 세션</th><td>발급 후 최대 30일, 로그아웃·만료 후 정리</td></tr>
          <tr><th>보안 감사 기록</th><td>최대 90일</td></tr>
          <tr><th>AI 임시 파일</th><td>분석 완료 후 삭제를 요청하며, 업로드 시 최대 1시간 만료를 설정</td></tr>
          <tr><th>서비스 분석 정보</th><td>Google Analytics 4 속성에 설정된 데이터 보유기간까지</td></tr>
        </tbody></table>
        <p>관계 법령에 따라 별도 보관이 필요한 경우에는 해당 기간 동안 분리하여 보관합니다.</p>
      </LegalSection>
      <LegalSection title="4. 외부 서비스 이용"><p>회원이 해당 기능을 실행하거나 서비스를 방문한 경우 필요한 범위의 정보가 다음 외부 서비스로 전달될 수 있습니다.</p><table className="dm-legal-table"><tbody><tr><th>Google·카카오</th><td>소셜 로그인과 인증된 계정 정보 제공</td></tr><tr><th>Google Analytics 4</th><td>웹사이트 유입과 기능 이용 흐름 분석. 광고 개인화 및 Google Signals는 사용하지 않으며 이메일·표시 이름·사업자료 내용은 전송하지 않음</td></tr><tr><th>OpenAI API</th><td>사업자료 분석 및 신청서 초안 생성. 사용자가 해당 기능을 실행할 때 필요한 자료와 입력만 전달</td></tr><tr><th>PortOne·결제대행사</th><td>30일 이용권과 일회성 크레딧 결제, 결제수단 인증, 영수증 및 환불 처리. 결제 이메일, 선택 상품, 결제수단 및 청구 정보가 각 결제 서비스의 정책에 따라 처리됨</td></tr><tr><th>Resend</th><td>알림 수신 이메일, 제목과 알림 본문, 30일 이용권 만료 안내 전송</td></tr></tbody></table></LegalSection>
      <LegalSection title="5. 이용자의 권리"><p>이용자는 서비스에서 자신의 저장 정보를 확인·수정하고, 데이터 내보내기 또는 회원 탈퇴를 요청할 수 있습니다. 커뮤니티에서는 다른 사용자에게 이름과 이메일을 표시하지 않지만, 운영상 부정 이용 방지와 탈퇴·내보내기 처리를 위해 작성 계정과 연결하여 보관합니다. 개인정보 처리에 대한 추가 문의와 정정·삭제 요청은 <a href="mailto:sseung.chip@gmail.com">sseung.chip@gmail.com</a>으로 접수합니다.</p></LegalSection>
      <LegalSection title="6. 안전성 확보 조치"><ul><li>HTTPS 통신과 서버 측 로그인 세션 검증</li><li>계정 소유권에 따른 데이터 접근 통제</li><li>운영자 허용 목록과 주요 작업 감사 기록</li><li>운영 키의 비밀값 저장 및 소스코드와 분리</li><li>탈퇴 시 데이터베이스와 업로드 원본 삭제</li></ul></LegalSection>
      <LegalSection title="7. 개인정보 보호책임자"><table className="dm-legal-table"><tbody><tr><th>운영 주체</th><td>Team. DM</td></tr><tr><th>개인정보 보호책임자</th><td>백승훈</td></tr><tr><th>문의 이메일</th><td><a href="mailto:sseung.chip@gmail.com">sseung.chip@gmail.com</a></td></tr></tbody></table></LegalSection>
      <LegalSection title="8. 방침 변경"><p>개인정보 처리방침이 변경되면 적용일과 주요 변경 내용을 서비스에서 미리 알립니다. 이용자 권리에 중요한 변경은 필요한 경우 별도 동의를 받습니다.</p></LegalSection>
    </LegalShell>
  );
}
