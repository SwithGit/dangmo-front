"use client";

import type { RegionSummary } from "./region-map-types";

export function RegionSummaryPanel({ title, regions, selectedCode, onSelect }: {
  title: string;
  regions: RegionSummary[];
  selectedCode: string;
  onSelect: (region: RegionSummary) => void;
}) {
  return <aside className="dm-region-directory" aria-label={`${title} 지역 목록`}>
    <header><div><strong>{title}</strong><small>지도 없이 목록만으로도 선택할 수 있어요.</small></div><span>{regions.length}곳</span></header>
    <div className="dm-region-directory-list">
      {regions.map((region) => <button className={selectedCode === region.code ? "is-selected" : ""} type="button" key={region.code} aria-pressed={selectedCode === region.code} onClick={() => onSelect(region)}>
        <span><strong>{region.name}</strong><small>{region.closestDeadline ? `가장 가까운 마감 ${new Date(region.closestDeadline).toLocaleDateString("ko-KR")}` : "모집 중 공고 없음"}</small></span>
        <b>{region.regionalOpenCount}<small>건</small></b>
      </button>)}
    </div>
  </aside>;
}

