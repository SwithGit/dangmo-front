import type { Metadata } from "next";
import { LegalSection, LegalShell } from "../legal-shell";

export const metadata: Metadata = { title: "AI 문서 처리 안내 | 당모", robots: { index: false, follow: false } };

export default function AiPolicyPage() {
  return (
    <LegalShell current="ai" kicker="RESPONSIBLE AI" title="AI 문서 처리 안내" summary="사업자료 분석과 서류작성 AI가 사용하는 정보, 결과의 한계와 이용자가 확인해야 할 사항을 설명합니다.">
      <LegalSection title="1. AI가 작동하는 경우"><p>사업자료 분석, 문장 다듬기, 근거 보강 또는 초안 생성 버튼을 이용자가 직접 실행할 때 AI 처리가 시작됩니다. 단순 공고 열람과 사업비 직접 계산에는 AI 문서 처리가 필요하지 않습니다.</p></LegalSection>
      <LegalSection title="2. 전달되는 정보"><ul><li>분석 대상 사업계획서, IR, PDF·Word·PowerPoint·Excel 등 사용자가 선택한 파일</li><li>사용자가 승인한 AI 사업 프로필과 근거 정보</li><li>현재 작성 중인 문항의 주제, 작성 가이드와 초안</li></ul><p>비밀번호, 주민등록번호, 계좌정보처럼 신청서 작성에 필요하지 않은 민감정보는 업로드 전에 제거해 주세요.</p></LegalSection>
      <LegalSection title="3. 저장과 삭제"><p>원본 자료는 회원의 비공개 작업공간에 보관됩니다. AI 분석을 위해 외부 API에 전달하는 파일은 짧은 만료 시간을 설정하고 처리 후 삭제 요청을 수행합니다. AI 응답 생성 요청은 서비스 코드에서 별도 응답 저장을 비활성화합니다.</p></LegalSection>
      <LegalSection title="4. AI 결과의 검토"><div className="dm-legal-notice">AI가 만든 추천, 요약과 문장은 사실 확인이 끝난 최종 제출물이 아닙니다.</div><ul><li>자료에 없는 수치나 실적은 생성하지 않도록 지시하지만 오류 가능성이 있습니다.</li><li>자격조건, 지원금 비율, 제출서류와 마감일은 반드시 공고 원문에서 확인해야 합니다.</li><li>최종 제출 책임은 회원에게 있으며, 잘못된 내용은 직접 수정하고 근거를 확인해야 합니다.</li></ul></LegalSection>
      <LegalSection title="5. 추천 로직"><p>맞춤 추천은 사업자등록일 기반 창업연차, 제11차 한국표준산업분류 코드와 사업장 지역 등 명시적 자격조건을 먼저 확인하고, 승인된 사업 프로필을 기준으로 사업목적, 성장단계, 실행역량과 선호조건을 점수화합니다. 확인되지 않은 조건은 자동으로 충족 처리하지 않고 ‘확인 필요’로 표시합니다.</p></LegalSection>
      <LegalSection title="6. 이용 제한과 이의 제기"><p>허위 신청서 작성, 타인의 영업비밀·개인정보 침해 또는 자동화된 대량 요청에는 AI 기능 이용이 제한될 수 있습니다. 분석 결과나 처리 범위에 대한 문의는 <a href="mailto:sseung.chip@gmail.com">sseung.chip@gmail.com</a>으로 접수합니다.</p></LegalSection>
      <LegalSection title="7. 외부 공급자 정책"><p>운영 환경에서는 OpenAI Responses API와 파일 입력 기능을 사용합니다. 사용자가 AI 기능을 실행할 때 필요한 입력과 선택한 자료만 전달하며, 서비스 요청은 응답 저장을 비활성화하도록 구성합니다.</p><p><a href="https://developers.openai.com/api/docs/guides/your-data" target="_blank" rel="noreferrer">OpenAI API 데이터 처리 정책 확인 ↗</a></p></LegalSection>
    </LegalShell>
  );
}
