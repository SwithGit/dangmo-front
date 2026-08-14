"use client";

import type { RegionalAnnouncement } from "./region-map-types";

const dateLabel = (value: string) => value ? new Date(value).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }) : "마감일 원문 확인";

function AnnouncementButtons({ announcements, selectedId, onSelect, badge }: {
  announcements: RegionalAnnouncement[];
  selectedId: string;
  onSelect: (announcement: RegionalAnnouncement) => void;
  badge?: string;
}) {
  return announcements.map((announcement) => <button className={selectedId === announcement.id ? "is-selected" : ""} type="button" key={announcement.id} onClick={() => onSelect(announcement)}>
    <span><b>{badge ?? announcement.regionLimitLabel ?? announcement.category}</b><small>{announcement.institution}</small></span>
    <strong>{announcement.title}</strong>
    <span><small>{announcement.target}</small><em>{dateLabel(announcement.applyEndAt)} 마감</em></span>
  </button>);
}

export function RegionAnnouncementList({ regional, province, provinceName, showProvince, nationwide, selectedId, onSelect }: {
  regional: RegionalAnnouncement[];
  province: RegionalAnnouncement[];
  provinceName: string;
  showProvince: boolean;
  nationwide: RegionalAnnouncement[];
  selectedId: string;
  onSelect: (announcement: RegionalAnnouncement) => void;
}) {
  return <div className="dm-region-announcement-groups">
    <section>
      <header><div><strong>지역 대상 지원사업</strong><small>지도 숫자에 포함되는 공고</small></div><span>{regional.length}건</span></header>
      <div className="dm-region-announcement-list">
        {regional.length ? <AnnouncementButtons announcements={regional} selectedId={selectedId} onSelect={onSelect} /> : <div className="dm-region-empty"><strong>현재 확인된 지역 대상 공고가 없습니다.</strong><p>{provinceName} 전체 또는 전국 공통 공고를 확인해주세요.</p></div>}
      </div>
    </section>
    {showProvince ? <section className="is-province">
      <header><div><strong>{provinceName} 전체 지원사업</strong><small>시·군·구 지도 숫자와 분리</small></div><span>{province.length}건</span></header>
      <div className="dm-region-announcement-list">
        <AnnouncementButtons announcements={province} selectedId={selectedId} onSelect={onSelect} badge={provinceName} />
      </div>
    </section> : null}
    <section className="is-nationwide">
      <header><div><strong>전국 공통 지원사업</strong><small>지도 숫자와 분리해 표시</small></div><span>{nationwide.length}건</span></header>
      <div className="dm-region-announcement-list">
        <AnnouncementButtons announcements={nationwide} selectedId={selectedId} onSelect={onSelect} badge="전국" />
      </div>
    </section>
  </div>;
}
