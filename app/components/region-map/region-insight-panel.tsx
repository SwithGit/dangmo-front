"use client";

import { useState } from "react";
import type { RegionalAnnouncement, RegionalWritingContext, RegionInsightResponse } from "./region-map-types";

const sourceTypeLabel: Record<string, string> = {
  official: "공식자료", plan: "정책·계획", council: "의회자료", statistics: "공공통계",
  finance: "재정자료", budget: "예산자료", news: "뉴스",
};
const scopeLabel = { unit_wide: "분석 지역 전체", local_case: "내부 지역 사례", province_context: "경기도 전체 배경" } as const;
const trendLabel = { rising: "증가", stable: "유지", declining: "감소", mixed: "혼합" } as const;

export function RegionInsightPanel({ result, announcement, onWrite }: {
  result: RegionInsightResponse;
  announcement: RegionalAnnouncement;
  onWrite: (context: RegionalWritingContext, announcement: RegionalAnnouncement) => void;
}) {
  const [angleId, setAngleId] = useState(result.insight.proposalAngles[0]?.id ?? "");
  const insight = result.insight;
  const analysisUnit = insight.analysisUnit ?? {
    id: `legacy:${insight.region.code}`,
    name: insight.region.name,
    kind: insight.region.code.length === 2 ? "region" as const : "municipality" as const,
    memberRegionCodes: [insight.region.code],
  };
  const readiness = insight.readiness ?? {
    ready: insight.status === "ready",
    documentCount: insight.evidence.length,
    publisherCount: new Set(insight.evidence.map((item) => item.publisher)).size,
    officialDocumentCount: insight.evidence.filter((item) => ["official", "plan", "statistics", "finance", "budget"].includes(item.sourceType)).length,
    recentDocumentCount: insight.evidence.length,
    directDocumentCount: insight.evidence.length,
    missing: [],
  };
  const selected = insight.proposalAngles.find((angle) => angle.id === angleId);
  const blocked = insight.status !== "ready";
  return <section className="dm-region-insight-result" aria-live="polite">
    <header className="dm-region-insight-head">
      <div><span>지역 인사이트 분석</span><h2>{analysisUnit.name} × {insight.announcement.title}</h2><p>{insight.summary}</p></div>
      <div className="dm-region-insight-billing"><strong>{result.billing.creditCost === 0 ? "무료 분석" : `AI 크레딧 ${result.billing.creditCost}`}</strong><small>{result.billing.cacheHit ? "개인화 결과 캐시 재사용 · 중복 차감 없음" : `실제 차감 ${result.billing.chargedCredits} · 잔액 ${result.billing.remainingCredits ?? "-"}`}</small></div>
    </header>

    <div className="dm-region-analysis-meta">
      <span><small>분석 단위</small>{analysisUnit.kind === "region" ? "시·도 전체" : "경기 시·군"}</span>
      <span><small>분석 기준일</small>{new Date(insight.analyzedAt).toLocaleString("ko-KR")}</span>
      <span><small>자료 범위</small>뉴스 {insight.lookbackMonths}개월 · 정책/통계 24개월</span>
      <span><small>데이터 상태</small>{insight.dataState === "ready" ? "운영 자료 준비됨" : insight.dataState === "preview" || insight.previewData ? "개발용 미리보기" : "근거 준비 중"}</span>
    </div>
    <aside className="dm-region-uncertainty"><strong>불확실성 안내 · 근거 범위</strong><p>{insight.uncertaintyNotice}</p></aside>

    {blocked ? <div className="dm-region-empty">
      <strong>{insight.status === "analysis_failed" ? "분석 결과를 검증하지 못했습니다." : "근거가 충분하지 않습니다."}</strong>
      <p>근거가 없는 제안 방향은 만들지 않았습니다.</p>
      {readiness.missing.length > 0 && <ul>{readiness.missing.map((item) => <li key={item}>{item}</li>)}</ul>}
      <small>현재 유효 자료 {readiness.documentCount}건 · 발행기관 {readiness.publisherCount}곳 · 공식/통계/재정 {readiness.officialDocumentCount}건</small>
    </div> : <>
      <section className="dm-region-issues"><h3>근거로 확인한 지역 이슈</h3><div>{insight.issues.map((issue, index) => <article key={issue.id ?? issue.title}>
        <span>0{index + 1}</span><div><strong>{issue.title}</strong><p>{issue.summary}</p>
          <small>{scopeLabel[issue.scope ?? "unit_wide"]}{issue.trend ? ` · 추세 ${trendLabel[issue.trend]}` : ""}{typeof issue.score === "number" ? ` · 점수 ${issue.score}` : ""} · 신뢰도 {issue.confidence === "high" ? "높음" : issue.confidence === "medium" ? "보통" : "낮음"} · 근거 {issue.evidenceIds.length}건</small>
          {(issue.limitations?.length ?? 0) > 0 && <p>한계: {issue.limitations?.join(" · ")}</p>}
        </div>
      </article>)}</div></section>
      <section className="dm-region-angles"><h3>공고와 사업에 맞춘 제안 방향</h3><div>{insight.proposalAngles.map((angle, index) => <button className={angleId === angle.id ? "is-selected" : ""} type="button" key={angle.id} aria-pressed={angleId === angle.id} onClick={() => setAngleId(angle.id)}>
        <span>방향 {index + 1}{typeof angle.fitScore === "number" ? ` · 적합도 ${angle.fitScore}` : ""}</span><strong>{angle.title}</strong><p>{angle.rationale}</p>
        <dl>
          {angle.regionalProblem && <div><dt>지역 문제</dt><dd>{angle.regionalProblem}</dd></div>}
          {angle.proposedSolution && <div><dt>해결 방식</dt><dd>{angle.proposedSolution}</dd></div>}
          {angle.announcementFit && <div><dt>공고 적합성</dt><dd>{angle.announcementFit}</dd></div>}
          {angle.businessFit && <div><dt>사업 적합성</dt><dd>{angle.businessFit}</dd></div>}
          <div><dt>수혜 대상</dt><dd>{angle.beneficiaries.join(" · ")}</dd></div>
          {(angle.executionPlan?.length ?? 0) > 0 && <div><dt>실행 단계</dt><dd>{angle.executionPlan?.join(" → ")}</dd></div>}
          <div><dt>성과지표 예시</dt><dd>{angle.suggestedMetrics.join(" · ")}</dd></div>
          <div><dt>추가 확인</dt><dd>{angle.cautions.join(" · ")}</dd></div>
        </dl>
      </button>)}</div></section>
    </>}

    <section className="dm-region-evidence"><h3>분석 근거 자료</h3><div>{insight.evidence.map((evidence) => <a href={evidence.sourceUrl} target="_blank" rel="noreferrer" key={evidence.id}>
      <span>{sourceTypeLabel[evidence.sourceType] ?? evidence.sourceType} · {scopeLabel[evidence.scope ?? "unit_wide"]}</span>
      <strong>{evidence.title}</strong>
      {evidence.summary && <p>{evidence.summary}</p>}
      {(evidence.extractedFacts?.length ?? 0) > 0 && <p><b>핵심 사실</b> {evidence.extractedFacts?.slice(0, 3).join(" · ")}</p>}
      <small>{evidence.publisher} · {new Date(evidence.publishedAt).toLocaleDateString("ko-KR")}{evidence.detailRegionLabel ? ` · ${evidence.detailRegionLabel}` : ""} · 원문 보기 ↗</small>
    </a>)}</div></section>
    <footer><p>{blocked || !selected ? "준비된 제안 방향이 없어 작성 화면으로 이동할 수 없습니다." : "선택한 방향과 근거 ID만 제안서 작성 AI에 전달됩니다. 신청 자격과 원문 수치는 제출 전에 다시 확인하세요."}</p><button className="dm-primary-button" type="button" disabled={!selected || blocked} onClick={() => selected && onWrite({ regionCode: insight.region.code, regionInsightId: insight.id, proposalAngleId: selected.id, announcementId: insight.announcement.id, regionName: analysisUnit.name, proposalAngleTitle: selected.title }, announcement)}>이 방향으로 제안서 작성하기</button></footer>
  </section>;
}
