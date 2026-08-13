"use client";

import { useEffect, useMemo, useState } from "react";
import { trackEvent } from "../../../lib/analytics";
import { AdministrativeMap } from "./administrative-map";
import { loadRegionAnnouncements, loadRegions, requestRegionInsight } from "./region-map-api";
import { RegionAnnouncementList } from "./region-announcement-list";
import { RegionInsightPanel } from "./region-insight-panel";
import { RegionSummaryPanel } from "./region-summary-panel";
import type { RegionalAnnouncement, RegionalWritingContext, RegionAnnouncementsPayload, RegionInsightResponse, RegionSummary } from "./region-map-types";

function statusOf(error: unknown) {
  return typeof error === "object" && error && "status" in error ? Number((error as { status: unknown }).status) : 0;
}

function updateQuery(areaCode: string, regionCode = "", announcementId = "") {
  const params = new URLSearchParams();
  if (areaCode) params.set("area", areaCode === "11" ? "seoul" : "gyeonggi");
  if (regionCode) params.set("region", regionCode);
  if (announcementId) params.set("announcement", announcementId);
  window.history.pushState({}, "", `/app/map${params.size ? `?${params}` : ""}`);
}

export function RegionMapView({ onLogin, onWrite }: {
  onLogin: () => void;
  onWrite: (context: RegionalWritingContext, announcement: RegionalAnnouncement) => Promise<void>;
}) {
  const [provinces, setProvinces] = useState<RegionSummary[]>([]);
  const [children, setChildren] = useState<RegionSummary[]>([]);
  const [areaCode, setAreaCode] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<RegionSummary | null>(null);
  const [announcements, setAnnouncements] = useState<RegionAnnouncementsPayload | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<RegionalAnnouncement | null>(null);
  const [insight, setInsight] = useState<RegionInsightResponse | null>(null);
  const [sort, setSort] = useState("deadline");
  const [category, setCategory] = useState("전체");
  const [listOnly, setListOnly] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [analysisState, setAnalysisState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const initialArea = params.get("area") === "seoul" ? "11" : params.get("area") === "gyeonggi" ? "41" : "";
    const initialRegion = params.get("region") ?? "";
    const initialAnnouncement = params.get("announcement") ?? "";
    void Promise.all([loadRegions(), initialArea ? loadRegions(initialArea) : Promise.resolve(null)]).then(async ([provincePayload, childPayload]) => {
      if (!active) return;
      setProvinces(provincePayload.regions);
      setAreaCode(initialArea);
      if (childPayload) {
        setChildren(childPayload.regions);
        const region = childPayload.regions.find((item) => item.code === initialRegion) ?? null;
        if (region) {
          setSelectedRegion(region);
          const payload = await loadRegionAnnouncements(region.code, "deadline");
          if (!active) return;
          setAnnouncements(payload);
          const all = [...payload.regionalAnnouncements, ...payload.nationwideAnnouncements];
          setSelectedAnnouncement(all.find((item) => item.id === initialAnnouncement) ?? null);
        }
      }
      setState("ready");
      trackEvent("map_explore_view", { area: initialArea || "korea" });
    }).catch((nextError) => {
      if (!active) return;
      setError(nextError instanceof Error ? nextError.message : "지역 정보를 불러오지 못했습니다.");
      setState("error");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const restore = () => {
      const params = new URLSearchParams(window.location.search);
      const nextArea = params.get("area") === "seoul" ? "11" : params.get("area") === "gyeonggi" ? "41" : "";
      const nextRegion = params.get("region") ?? "";
      const nextAnnouncement = params.get("announcement") ?? "";
      if (!nextArea) {
        setAreaCode(""); setChildren([]); setSelectedRegion(null); setAnnouncements(null); setSelectedAnnouncement(null); setInsight(null);
        return;
      }
      void loadRegions(nextArea).then(async (payload) => {
        if (!active) return;
        setAreaCode(nextArea); setChildren(payload.regions); setInsight(null);
        const region = payload.regions.find((item) => item.code === nextRegion) ?? null;
        setSelectedRegion(region);
        if (!region) { setAnnouncements(null); setSelectedAnnouncement(null); return; }
        const announcementPayload = await loadRegionAnnouncements(region.code, sort);
        if (!active) return;
        setAnnouncements(announcementPayload);
        setSelectedAnnouncement([...announcementPayload.regionalAnnouncements, ...announcementPayload.nationwideAnnouncements].find((item) => item.id === nextAnnouncement) ?? null);
      }).catch((nextError) => { if (active) setError(nextError instanceof Error ? nextError.message : "지역 상태를 복원하지 못했습니다."); });
    };
    window.addEventListener("popstate", restore);
    return () => { active = false; window.removeEventListener("popstate", restore); };
  }, [sort]);

  const categories = useMemo(() => ["전체", ...new Set((announcements?.regionalAnnouncements ?? []).map((item) => item.category))], [announcements]);
  const filteredRegional = useMemo(() => (announcements?.regionalAnnouncements ?? []).filter((item) => category === "전체" || item.category === category), [announcements, category]);

  const selectArea = async (region: RegionSummary) => {
    setAreaCode(region.code);
    setSelectedRegion(null);
    setAnnouncements(null);
    setSelectedAnnouncement(null);
    setInsight(null);
    setError("");
    updateQuery(region.code);
    try {
      const payload = await loadRegions(region.code);
      setChildren(payload.regions);
      trackEvent("region_selected", { level: "province", region_code: region.code });
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "하위 지역을 불러오지 못했습니다."); }
  };

  const selectRegion = async (region: RegionSummary, nextSort = sort) => {
    setSelectedRegion(region);
    setSelectedAnnouncement(null);
    setInsight(null);
    setError("");
    updateQuery(areaCode, region.code);
    try {
      const payload = await loadRegionAnnouncements(region.code, nextSort);
      setAnnouncements(payload);
      trackEvent("region_selected", { level: "municipality", region_code: region.code });
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "지역 지원사업을 불러오지 못했습니다."); }
  };

  const selectAnnouncement = (announcement: RegionalAnnouncement) => {
    setSelectedAnnouncement(announcement);
    setInsight(null);
    updateQuery(areaCode, selectedRegion?.code ?? "", announcement.id);
  };

  const analyze = async () => {
    if (!selectedRegion || !selectedAnnouncement || analysisState === "loading") return;
    setAnalysisState("loading");
    setError("");
    try {
      const payload = await requestRegionInsight(selectedRegion.code, selectedAnnouncement.id);
      setInsight(payload);
      setAnalysisState("idle");
      trackEvent("region_insight_requested", { region_code: selectedRegion.code, announcement_id: selectedAnnouncement.id, cache_hit: payload.billing.cacheHit, credit_cost: payload.billing.creditCost });
    } catch (nextError) {
      if (statusOf(nextError) === 401) onLogin();
      setError(nextError instanceof Error ? nextError.message : "지역 인사이트를 분석하지 못했습니다.");
      setAnalysisState("error");
    }
  };

  if (state === "loading") return <div className="dm-region-page-state" role="status">서울·경기 행정구역과 지원사업을 불러오는 중…</div>;
  if (state === "error") return <div className="dm-region-page-state is-error" role="alert"><strong>지도 탐색을 시작하지 못했습니다.</strong><p>{error}</p></div>;

  const areaName = areaCode === "11" ? "서울특별시" : "경기도";
  const mapAsset = areaCode === "11" ? "/maps/seoul-municipalities.geojson" : "/maps/gyeonggi-municipalities.geojson";
  return <div className="dm-region-map-view">
    <section className="dm-region-intro">
      <div><span>SEOUL · GYEONGGI MVP</span><h2>지역의 정책 수요에서 지원사업 아이디어까지</h2><p>서울과 경기도의 모집 중 공고를 행정구역별로 탐색하고, 최근 공식자료를 근거로 제안 방향을 검토하세요.</p></div>
      <aside><strong>지역 인사이트 무료 분석</strong><small>AI 크레딧 0 · 테스트 기간</small></aside>
    </section>

    {error ? <aside className="dm-region-error" role="alert">{error}<button type="button" onClick={() => setError("")}>닫기</button></aside> : null}

    {!areaCode ? <section className="dm-region-overview">
      <header><div><span>1단계</span><h2>탐색할 권역을 선택하세요</h2><p>현재 서울특별시와 경기도만 상세 분석을 지원합니다. 회색 지역은 순차적으로 열릴 예정입니다.</p></div><button className="dm-button" type="button" onClick={() => setListOnly((value) => !value)}>{listOnly ? "지도와 함께 보기" : "목록으로 보기"}</button></header>
      <div className={listOnly ? "dm-region-map-layout is-list-only" : "dm-region-map-layout"}>
        <AdministrativeMap asset="/maps/korea-overview.geojson" regions={provinces} selectedCode="" overview onSelect={(region) => void selectArea(region)} />
        <RegionSummaryPanel title="지원 권역" regions={provinces} selectedCode="" onSelect={(region) => void selectArea(region)} />
      </div>
      <aside className="dm-region-coming"><strong>그 외 14개 시·도</strong><span>준비 중</span><p>행정구역과 공식자료 공급자 검증이 끝난 지역부터 순차 지원합니다.</p></aside>
    </section> : <>
      <section className="dm-region-detail-map">
        <header><div><button type="button" onClick={() => { setAreaCode(""); setChildren([]); setSelectedRegion(null); setAnnouncements(null); setInsight(null); updateQuery(""); }}>← 전국 보기</button><span>2단계</span><h2>{areaName} 상세 지도</h2><p>{areaCode === "11" ? "25개 자치구" : "31개 시·군"}의 지역 대상 모집 중 공고 수입니다. 0건인 지역도 선택할 수 있습니다.</p></div><button className="dm-button" type="button" onClick={() => setListOnly((value) => !value)}>{listOnly ? "지도와 함께 보기" : "목록으로 보기"}</button></header>
        <div className={listOnly ? "dm-region-map-layout is-list-only" : "dm-region-map-layout"}>
          <AdministrativeMap key={areaCode} asset={mapAsset} regions={children} selectedCode={selectedRegion?.code ?? ""} onSelect={(region) => void selectRegion(region)} />
          <RegionSummaryPanel title={`${areaName} 지역 목록`} regions={children} selectedCode={selectedRegion?.code ?? ""} onSelect={(region) => void selectRegion(region)} />
        </div>
      </section>

      {selectedRegion && announcements ? <section className="dm-region-business-panel">
        <header className="dm-region-panel-head"><div><span>3단계 · 선택 지역</span><h2>{selectedRegion.name} 지원사업</h2><p>지역 대상 {announcements.pagination.total}건 · 전국 공통 {announcements.nationwideAnnouncements.length}건{announcements.closestDeadline ? ` · 가장 가까운 마감 ${new Date(announcements.closestDeadline).toLocaleDateString("ko-KR")}` : ""}</p></div>{announcements.previewData ? <b>테스트 데이터</b> : null}</header>
        <div className="dm-region-filters"><label>정렬<select value={sort} onChange={(event) => { setSort(event.target.value); void selectRegion(selectedRegion, event.target.value); }}><option value="deadline">마감 임박순</option><option value="latest">최신순</option><option value="recommendation">추천순</option></select></label><label>사업 분야<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><span>모집 상태 <b>모집 중</b></span><span>대상 <b>지역 + 전국 분리</b></span></div>
        <RegionAnnouncementList regional={filteredRegional} nationwide={announcements.nationwideAnnouncements} selectedId={selectedAnnouncement?.id ?? ""} onSelect={selectAnnouncement} />
        <aside className={`dm-region-analysis-action${selectedAnnouncement ? " is-ready" : ""}`}>
          <div><span aria-hidden="true">✦</span><div><strong>{selectedAnnouncement ? selectedAnnouncement.title : "분석할 지원사업을 먼저 선택하세요"}</strong><p>{selectedAnnouncement ? `${selectedRegion.name}의 최근 12개월 공식자료와 정책 수요 신호를 연결합니다.` : "지역 또는 전국 공통 지원사업 중 하나를 선택하면 분석 버튼이 활성화됩니다."}</p></div></div>
          <button className="dm-primary-button" type="button" disabled={!selectedAnnouncement || analysisState === "loading"} onClick={() => void analyze()}>{analysisState === "loading" ? "지역 자료 분석 중…" : "지역 인사이트 무료 분석"}<small>AI 크레딧 0 · 테스트 기간</small></button>
        </aside>
      </section> : <div className="dm-region-select-prompt"><span aria-hidden="true">⌖</span><strong>{areaName}에서 시·군·구를 선택하세요.</strong><p>지도 또는 지역 목록을 이용할 수 있습니다.</p></div>}
    </>}

    {insight && selectedAnnouncement ? <RegionInsightPanel key={insight.insight.id} result={insight} announcement={selectedAnnouncement} onWrite={(context, announcement) => { trackEvent("proposal_angle_selected", { region_code: context.regionCode, proposal_angle_id: context.proposalAngleId }); void onWrite(context, announcement); }} /> : null}
    <footer className="dm-region-map-source">지도 경계: 통계청 SGIS 기반 행정동 경계 가공물(admdongkor 2026-07-01, CC BY 4.0·공공누리 제1유형). 상세 출처와 라이선스는 저장소의 지도 데이터 문서를 확인하세요.</footer>
  </div>;
}
