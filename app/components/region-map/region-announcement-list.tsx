"use client";

import type { RegionalAnnouncement } from "./region-map-types";

const dateLabel = (value: string) => value ? new Date(value).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }) : "마감일 원문 확인";

export function RegionAnnouncementList({ regional, nationwide, selectedId, onSelect }: {
  regional: RegionalAnnouncement[];
  nationwide: RegionalAnnouncement[];
  selectedId: string;
  onSelect: (announcement: RegionalAnnouncement) => void;
}) {
  return <div className="dm-region-announcement-groups">
    <section>
      <header><div><strong>지역 대상 지원사업</strong><small>지도 숫자에 포함되는 공고</small></div><span>{regional.length}건</span></header>
      <div className="dm-region-announcement-list">
        {regional.length ? regional.map((announcement) => <button className={selectedId === announcement.id ? "is-selected" : ""} type="button" key={announcement.id} onClick={() => onSelect(announcement)}>
          <span><b>{announcement.category}</b><small>{announcement.institution}</small></span>
          <strong>{announcement.title}</strong>
          <span><small>{announcement.target}</small><em>{dateLabel(announcement.applyEndAt)} 마감</em></span>
        </button>) : <div className="dm-region-empty"><strong>현재 확인된 지역 대상 공고가 없습니다.</strong><p>전국 공통 공고를 확인하거나 이후 수집 결과를 다시 확인해주세요.</p></div>}
      </div>
    </section>
    <section className="is-nationwide">
      <header><div><strong>전국 공통 지원사업</strong><small>지도 숫자와 분리해 표시</small></div><span>{nationwide.length}건</span></header>
      <div className="dm-region-announcement-list">
        {nationwide.map((announcement) => <button className={selectedId === announcement.id ? "is-selected" : ""} type="button" key={announcement.id} onClick={() => onSelect(announcement)}>
          <span><b>전국</b><small>{announcement.institution}</small></span><strong>{announcement.title}</strong><span><small>{announcement.target}</small><em>{dateLabel(announcement.applyEndAt)} 마감</em></span>
        </button>)}
      </div>
    </section>
  </div>;
}

