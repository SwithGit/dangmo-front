"use client";

import { useState } from "react";
import type { RegionalAnnouncement, RegionalWritingContext, RegionInsightResponse } from "./region-map-types";

const sourceTypeLabel = { official: "공식자료", plan: "정책계획", council: "의회자료", statistics: "공공통계", news: "뉴스" } as const;

export function RegionInsightPanel({ result, announcement, onWrite }: {
  result: RegionInsightResponse;
  announcement: RegionalAnnouncement;
  onWrite: (context: RegionalWritingContext, announcement: RegionalAnnouncement) => void;
}) {
  const [angleId, setAngleId] = useState(result.insight.proposalAngles[0]?.id ?? "");
  const insight = result.insight;
  const selected = insight.proposalAngles.find((angle) => angle.id === angleId);
  return <section className="dm-region-insight-result" aria-live="polite">
    <header className="dm-region-insight-head">
      <div><span>지역 인사이트 분석</span><h2>{insight.region.name} × {insight.announcement.title}</h2><p>{insight.summary}</p></div>
      <div className="dm-region-insight-billing"><strong>{result.billing.creditCost === 0 ? "무료 분석" : `AI 크레딧 ${result.billing.creditCost}`}</strong><small>{result.billing.cacheHit ? "신선한 캐시 재사용 · 중복 차감 없음" : `실제 차감 ${result.billing.chargedCredits} · 잔액 ${result.billing.remainingCredits ?? "-"}`}</small></div>
    </header>

    <div className="dm-region-analysis-meta">
      <span><small>분석 기준일</small>{new Date(insight.analyzedAt).toLocaleString("ko-KR")}</span>
      <span><small>자료 범위</small>최근 {insight.lookbackMonths}개월</span>
      <span><small>데이터 상태</small>{insight.previewData ? "테스트 fixture" : "운영 자료"}</span>
    </div>
    <aside className="dm-region-uncertainty"><strong>불확실성 안내</strong><p>{insight.uncertaintyNotice}</p></aside>

    {insight.status === "insufficient_evidence" ? <div className="dm-region-empty"><strong>근거가 충분하지 않습니다.</strong><p>억지로 제안 방향을 만들지 않았습니다. 자료 갱신 후 다시 확인해주세요.</p></div> : <>
      <section className="dm-region-issues"><h3>최근 지역 현안</h3><div>{insight.issues.map((issue, index) => <article key={issue.title}><span>0{index + 1}</span><div><strong>{issue.title}</strong><p>{issue.summary}</p><small>근거 신뢰도 {issue.confidence === "high" ? "높음" : issue.confidence === "medium" ? "보통" : "낮음"} · 출처 {issue.evidenceIds.length}건</small></div></article>)}</div></section>
      <section className="dm-region-angles"><h3>검토할 수 있는 제안 방향</h3><div>{insight.proposalAngles.map((angle, index) => <button className={angleId === angle.id ? "is-selected" : ""} type="button" key={angle.id} aria-pressed={angleId === angle.id} onClick={() => setAngleId(angle.id)}>
        <span>방향 {index + 1}</span><strong>{angle.title}</strong><p>{angle.rationale}</p>
        <dl><div><dt>대상</dt><dd>{angle.beneficiaries.join(" · ")}</dd></div><div><dt>성과지표 예시</dt><dd>{angle.suggestedMetrics.join(" · ")}</dd></div><div><dt>추가 확인</dt><dd>{angle.cautions.join(" · ")}</dd></div></dl>
      </button>)}</div></section>
    </>}

    <section className="dm-region-evidence"><h3>분석 근거 자료</h3><div>{insight.evidence.map((evidence) => <a href={evidence.sourceUrl} target="_blank" rel="noreferrer" key={evidence.id}><span>{sourceTypeLabel[evidence.sourceType]}</span><strong>{evidence.title}</strong><small>{evidence.publisher} · {new Date(evidence.publishedAt).toLocaleDateString("ko-KR")} · 원문 보기 ↗</small></a>)}</div></section>
    <footer><p>선택한 지역 근거와 방향 ID만 기존 서류작성 AI에 전달합니다. 실제 본문 생성에는 기존 AI 크레딧 정책이 적용됩니다.</p><button className="dm-primary-button" type="button" disabled={!selected} onClick={() => selected && onWrite({ regionCode: insight.region.code, regionInsightId: insight.id, proposalAngleId: selected.id, announcementId: insight.announcement.id, regionName: insight.region.name, proposalAngleTitle: selected.title }, announcement)}>이 방향으로 제안서 작성하기</button></footer>
  </section>;
}

