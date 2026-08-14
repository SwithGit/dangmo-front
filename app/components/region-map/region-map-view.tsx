"use client";

import { useEffect, useMemo, useState } from "react";
import { trackEvent } from "../../../lib/analytics";
import { AdministrativeMap } from "./administrative-map";
import { loadRegionAnnouncements, loadRegionalEvidenceStatus, loadRegions, requestRegionInsight } from "./region-map-api";
import { RegionAnnouncementList } from "./region-announcement-list";
import { RegionInsightPanel } from "./region-insight-panel";
import { RegionSummaryPanel } from "./region-summary-panel";
import type { RegionalAnnouncement, RegionalEvidenceStatus, RegionalWritingContext, RegionAnnouncementsPayload, RegionInsightResponse, RegionSummary } from "./region-map-types";

const DETAIL_AREA_ASSETS: Record<string, string> = {
  "41": "/maps/gyeonggi-municipalities.geojson",
};

const dataStateCopy: Record<RegionalEvidenceStatus["dataState"], { label: string; description: string }> = {
  unconfigured: { label: "수집원 미연결", description: "아직 이 지역의 근거자료 수집원이 연결되지 않았습니다. 공식자료·통계·지역뉴스 공급자를 연결한 뒤 분석할 수 있습니다." },
  collecting: { label: "지역자료 수집 중", description: "지역자료를 처음 수집하고 있습니다. 완료 후 근거 충족 여부를 다시 확인합니다." },
  empty: { label: "수집 결과 없음", description: "수집원은 연결됐지만 지정한 기간에 유효한 자료를 찾지 못했습니다." },
  insufficient: { label: "근거 부족", description: "수집된 자료가 분석 기준에 아직 미치지 못했습니다." },
  ready: { label: "운영 자료 준비됨", description: "실제 공식·통계·재정·지역자료가 분석 기준을 충족했습니다." },
  preview: { label: "개발용 미리보기", description: "명시적으로 설정된 fixture 자료를 사용하는 개발 모드입니다." },
  error: { label: "자료 수집 오류", description: "최근 수집에 실패했습니다. 잠시 후 다시 확인해주세요." },
};

function statusOf(error: unknown) {
  return typeof error === "object" && error && "status" in error ? Number((error as { status: unknown }).status) : 0;
}

function areaFromQuery(value: string | null) {
  if (value === "seoul") return "11";
  if (value === "gyeonggi") return "41";
  return value && /^\d{2}$/.test(value) ? value : "";
}

function areaToQuery(code: string) {
  if (code === "11") return "seoul";
  if (code === "41") return "gyeonggi";
  return code;
}

function hasMunicipalityDetail(code: string) {
  return Boolean(DETAIL_AREA_ASSETS[code]);
}

function selectedFrom(payload: RegionAnnouncementsPayload, announcementId: string) {
  return [...payload.regionalAnnouncements, ...(payload.provinceAnnouncements ?? []), ...payload.nationwideAnnouncements]
    .find((item) => item.id === announcementId) ?? null;
}

function updateQuery(areaCode: string, regionCode = "", announcementId = "") {
  const params = new URLSearchParams();
  if (areaCode) params.set("area", areaToQuery(areaCode));
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
  const [evidenceStatus, setEvidenceStatus] = useState<RegionalEvidenceStatus | null>(null);
  const [sort, setSort] = useState("deadline");
  const [category, setCategory] = useState("전체");
  const [listOnly, setListOnly] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [analysisState, setAnalysisState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      const params = new URLSearchParams(window.location.search);
      const initialArea = areaFromQuery(params.get("area"));
      const initialRegion = params.get("region") ?? "";
      const initialAnnouncement = params.get("announcement") ?? "";
      const provincePayload = await loadRegions();
      if (!active) return;
      setProvinces(provincePayload.regions);
      const area = provincePayload.regions.find((item) => item.code === initialArea) ?? null;
      setAreaCode(area?.code ?? "");
      if (!area) {
        setState("ready");
        trackEvent("map_explore_view", { area: "korea" });
        return;
      }
      let region: RegionSummary | null = area;
      if (hasMunicipalityDetail(area.code)) {
        const childPayload = await loadRegions(area.code);
        if (!active) return;
        setChildren(childPayload.regions);
        region = childPayload.regions.find((item) => item.code === initialRegion) ?? area;
      }
      setSelectedRegion(region);
      if (region) {
        const [payload, status] = await Promise.all([
          loadRegionAnnouncements(region.code, "deadline"),
          region.code === "41" ? Promise.resolve(null) : loadRegionalEvidenceStatus(region.code),
        ]);
        if (!active) return;
        setAnnouncements(payload);
        setEvidenceStatus(status);
        if (status) trackEvent("region_evidence_status_viewed", { region_code: region.code, data_state: status.dataState, source_count: status.activeSourceCount, document_count: status.documentCount });
        setSelectedAnnouncement(selectedFrom(payload, initialAnnouncement));
      }
      setState("ready");
      trackEvent("map_explore_view", { area: area.code });
    };
    void load().catch((nextError) => {
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
      const nextArea = areaFromQuery(params.get("area"));
      const nextRegion = params.get("region") ?? "";
      const nextAnnouncement = params.get("announcement") ?? "";
      if (!nextArea) {
        setAreaCode(""); setChildren([]); setSelectedRegion(null); setAnnouncements(null); setSelectedAnnouncement(null); setInsight(null); setEvidenceStatus(null);
        return;
      }
      const load = async () => {
        const area = provinces.find((item) => item.code === nextArea) ?? null;
        if (!area) return;
        let region: RegionSummary | null = area;
        if (hasMunicipalityDetail(nextArea)) {
          const payload = await loadRegions(nextArea);
          if (!active) return;
          setChildren(payload.regions);
          region = payload.regions.find((item) => item.code === nextRegion) ?? area;
        } else setChildren([]);
        setAreaCode(nextArea); setSelectedRegion(region); setInsight(null); setEvidenceStatus(null);
        if (!region) { setAnnouncements(null); setSelectedAnnouncement(null); return; }
        const [announcementPayload, status] = await Promise.all([
          loadRegionAnnouncements(region.code, sort),
          region.code === "41" ? Promise.resolve(null) : loadRegionalEvidenceStatus(region.code),
        ]);
        if (!active) return;
        setAnnouncements(announcementPayload);
        setEvidenceStatus(status);
        setSelectedAnnouncement(selectedFrom(announcementPayload, nextAnnouncement));
      };
      void load().catch((nextError) => { if (active) setError(nextError instanceof Error ? nextError.message : "지역 상태를 복원하지 못했습니다."); });
    };
    window.addEventListener("popstate", restore);
    return () => { active = false; window.removeEventListener("popstate", restore); };
  }, [provinces, sort]);

  const categories = useMemo(() => ["전체", ...new Set((announcements?.regionalAnnouncements ?? []).map((item) => item.category))], [announcements]);
  const filteredRegional = useMemo(() => (announcements?.regionalAnnouncements ?? []).filter((item) => category === "전체" || item.category === category), [announcements, category]);
  const area = provinces.find((item) => item.code === areaCode) ?? null;
  const detailedArea = hasMunicipalityDetail(areaCode);
  const areaName = area?.name ?? "선택 지역";

  const selectArea = async (region: RegionSummary) => {
    const detailed = hasMunicipalityDetail(region.code);
    setAreaCode(region.code);
    setChildren([]);
    setSelectedRegion(region);
    setAnnouncements(null);
    setSelectedAnnouncement(null);
    setInsight(null);
    setEvidenceStatus(null);
    setError("");
    updateQuery(region.code, region.code);
    try {
      if (detailed) {
        const [childPayload, announcementPayload] = await Promise.all([loadRegions(region.code), loadRegionAnnouncements(region.code, sort)]);
        setChildren(childPayload.regions);
        setAnnouncements(announcementPayload);
      } else {
        const [announcementPayload, status] = await Promise.all([loadRegionAnnouncements(region.code, sort), loadRegionalEvidenceStatus(region.code)]);
        setAnnouncements(announcementPayload); setEvidenceStatus(status);
        trackEvent("region_evidence_status_viewed", { region_code: region.code, data_state: status.dataState, source_count: status.activeSourceCount, document_count: status.documentCount });
      }
      trackEvent("region_selected", { level: "province", region_code: region.code });
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "지역 정보를 불러오지 못했습니다."); }
  };

  const selectRegion = async (region: RegionSummary, nextSort = sort) => {
    setSelectedRegion(region);
    setSelectedAnnouncement(null);
    setInsight(null);
    setEvidenceStatus(null);
    setError("");
    updateQuery(areaCode, region.code);
    try {
      const [payload, status] = await Promise.all([loadRegionAnnouncements(region.code, nextSort), loadRegionalEvidenceStatus(region.code)]);
      setAnnouncements(payload);
      setEvidenceStatus(status);
      trackEvent("region_selected", { level: region.level, region_code: region.code });
      trackEvent("region_evidence_status_viewed", { region_code: region.code, data_state: status.dataState, source_count: status.activeSourceCount, document_count: status.documentCount });
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "지역 지원사업을 불러오지 못했습니다."); }
  };

  const clearArea = () => {
    setAreaCode(""); setChildren([]); setSelectedRegion(null); setAnnouncements(null); setSelectedAnnouncement(null); setInsight(null); setEvidenceStatus(null); updateQuery("");
  };

  const selectAnnouncement = (announcement: RegionalAnnouncement) => {
    setSelectedAnnouncement(announcement);
    setInsight(null);
    updateQuery(areaCode, selectedRegion?.code ?? "", announcement.id);
    trackEvent("map_announcement_selected", { region_code: selectedRegion?.code, analysis_unit_kind: evidenceStatus?.analysisUnit.kind });
  };

  const analyze = async () => {
    if (!selectedRegion || !selectedAnnouncement || !evidenceStatus || !new Set(["ready", "preview"]).has(evidenceStatus.dataState) || analysisState === "loading") {
      trackEvent("region_insight_blocked", { region_code: selectedRegion?.code, data_state: evidenceStatus?.dataState ?? "unconfigured", readiness_status: "blocked" });
      return;
    }
    setAnalysisState("loading");
    setError("");
    trackEvent("region_insight_started", { region_code: selectedRegion.code, data_state: evidenceStatus.dataState, analysis_unit_kind: evidenceStatus.analysisUnit.kind, source_count: evidenceStatus.activeSourceCount, document_count: evidenceStatus.documentCount });
    try {
      const payload = await requestRegionInsight(selectedRegion.code, selectedAnnouncement.id);
      setInsight(payload);
      setAnalysisState("idle");
      trackEvent(payload.insight.status === "ready" ? "region_insight_completed" : "region_insight_blocked", { region_code: selectedRegion.code, data_state: payload.insight.dataState ?? evidenceStatus.dataState, readiness_status: payload.insight.status, cache_hit: payload.billing.cacheHit, credit_cost: payload.billing.creditCost });
    } catch (nextError) {
      if (statusOf(nextError) === 401) onLogin();
      setError(nextError instanceof Error ? nextError.message : "지역 인사이트를 분석하지 못했습니다.");
      setAnalysisState("error");
      trackEvent("region_insight_failed", { region_code: selectedRegion.code, data_state: evidenceStatus.dataState, failure_code: statusOf(nextError) || "request_failed" });
    }
  };

  if (state === "loading") return <div className="dm-region-page-state" role="status">전국 행정구역과 지원사업을 불러오는 중…</div>;
  if (state === "error") return <div className="dm-region-page-state is-error" role="alert"><strong>지도 탐색을 시작하지 못했습니다.</strong><p>{error}</p></div>;

  return <div className="dm-region-map-view">
    <section className="dm-region-intro">
      <div><span>NATIONWIDE MAP</span><h2>지역의 정책 수요에서 지원사업 아이디어까지</h2><p>전국 모집 중 공고를 행정구역별로 탐색하고, 최근 공식자료를 근거로 제안 방향을 검토하세요.</p></div>
      <aside><strong>지역 인사이트 무료 분석</strong><small>AI 크레딧 0 · 테스트 기간</small></aside>
    </section>

    {error ? <aside className="dm-region-error" role="alert">{error}<button type="button" onClick={() => setError("")}>닫기</button></aside> : null}

    {!areaCode ? <section className="dm-region-overview">
      <header><div><span>1단계</span><h2>탐색할 시·도를 선택하세요</h2><p>경기도만 시·군을 선택하고, 서울과 다른 시·도는 지역 전체 단위로 분석합니다.</p></div><button className="dm-button" type="button" onClick={() => setListOnly((value) => !value)}>{listOnly ? "지도와 함께 보기" : "목록으로 보기"}</button></header>
      <div className={listOnly ? "dm-region-map-layout is-list-only" : "dm-region-map-layout"}>
        <AdministrativeMap asset="/maps/korea-overview.geojson" regions={provinces} selectedCode="" overview onSelect={(region) => void selectArea(region)} />
        <RegionSummaryPanel title="전국 시·도" regions={provinces} selectedCode="" onSelect={(region) => void selectArea(region)} />
      </div>
    </section> : <>
      {detailedArea ? <section className="dm-region-detail-map">
        <header><div><button type="button" onClick={clearArea}>← 전국 보기</button><span>2단계</span><h2>{areaName} 상세 지도</h2><p>{children.length}개 하위 시·군을 선택해 좁혀볼 수 있습니다. 현재 시·도 전체 공고 수는 전국 지도 숫자와 동일합니다.</p>{selectedRegion?.level === "municipality" && area ? <button type="button" onClick={() => void selectRegion(area)}>← {areaName} 전체 공고 {area.regionalOpenCount}건 보기</button> : null}</div><button className="dm-button" type="button" onClick={() => setListOnly((value) => !value)}>{listOnly ? "지도와 함께 보기" : "목록으로 보기"}</button></header>
        <div className={listOnly ? "dm-region-map-layout is-list-only" : "dm-region-map-layout"}>
          <AdministrativeMap key={areaCode} asset={DETAIL_AREA_ASSETS[areaCode]} regions={children} selectedCode={selectedRegion?.level === "municipality" ? selectedRegion.code : ""} onSelect={(region) => void selectRegion(region)} />
          <RegionSummaryPanel title={`${areaName} 시·군 목록`} regions={children} selectedCode={selectedRegion?.level === "municipality" ? selectedRegion.code : ""} onSelect={(region) => void selectRegion(region)} />
        </div>
      </section> : <section className="dm-region-detail-map">
        <header><div><button type="button" onClick={clearArea}>← 전국 보기</button><span>2단계</span><h2>{areaName} 지원사업</h2><p>{areaName}은 하위 시·군·구로 나누지 않고 지역 전체를 하나의 분석 단위로 제공합니다.</p></div></header>
        {selectedRegion ? <div className="dm-region-map-layout dm-region-map-single"><AdministrativeMap asset="/maps/korea-overview.geojson" regions={[selectedRegion]} selectedCode={selectedRegion.code} aggregateRegion={selectedRegion} onSelect={() => undefined} /></div> : null}
      </section>}

      {selectedRegion && announcements ? <section className="dm-region-business-panel">
        <header className="dm-region-panel-head"><div><span>3단계 · 선택 지역</span><h2>{selectedRegion.name} 지원사업</h2><p>지역 대상 {announcements.pagination.total}건{detailedArea && selectedRegion.level === "municipality" ? ` · ${areaName} 전체 ${(announcements.provinceAnnouncements ?? []).length}건` : ""} · 전국 공통 {announcements.nationwideAnnouncements.length}건{announcements.closestDeadline ? ` · 가장 가까운 지역 공고 마감 ${new Date(announcements.closestDeadline).toLocaleDateString("ko-KR")}` : ""}</p></div>{announcements.previewData ? <b>테스트 데이터</b> : null}</header>
        <div className="dm-region-filters"><label>정렬<select value={sort} onChange={(event) => { setSort(event.target.value); void selectRegion(selectedRegion, event.target.value); }}><option value="deadline">마감 임박순</option><option value="latest">최신순</option><option value="recommendation">추천순</option></select></label><label>사업 분야<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><span>모집 상태 <b>모집 중</b></span><span>대상 <b>지역 + 전국 분리</b></span></div>
        <RegionAnnouncementList regional={filteredRegional} province={announcements.provinceAnnouncements ?? []} provinceName={areaName} showProvince={detailedArea && selectedRegion.level === "municipality"} nationwide={announcements.nationwideAnnouncements} selectedId={selectedAnnouncement?.id ?? ""} onSelect={selectAnnouncement} />
        {selectedRegion.code === "41" ? <aside className="dm-region-evidence-state is-collecting"><strong>경기도 시·군을 선택해주세요.</strong><p>경기도 전체는 독립 분석 단위가 아니며 31개 시·군 중 하나를 선택해야 합니다.</p></aside> : evidenceStatus ? <aside className={`dm-region-evidence-state is-${evidenceStatus.dataState}`}><strong>{dataStateCopy[evidenceStatus.dataState].label}</strong><p>{dataStateCopy[evidenceStatus.dataState].description}</p><small>활성 수집원 {evidenceStatus.activeSourceCount}개 · 유효 자료 {evidenceStatus.documentCount}건 · 발행기관 {evidenceStatus.publisherCount}곳 · 공식/통계/재정 {evidenceStatus.officialDocumentCount}건</small>{evidenceStatus.missing.length ? <ul>{evidenceStatus.missing.map((item) => <li key={item}>{item}</li>)}</ul> : null}</aside> : null}
        <aside className={`dm-region-analysis-action${selectedAnnouncement ? " is-ready" : ""}`}>
          <div><span aria-hidden="true">✦</span><div><strong>{selectedAnnouncement ? selectedAnnouncement.title : "분석할 지원사업을 먼저 선택하세요"}</strong><p>{selectedAnnouncement ? `${selectedRegion.name}의 최근 12개월 공식자료와 정책 수요 신호를 연결합니다.` : "지역 또는 전국 공통 지원사업 중 하나를 선택하면 분석 버튼이 활성화됩니다."}</p></div></div>
          <button className="dm-primary-button" type="button" disabled={!selectedAnnouncement || !evidenceStatus || !new Set(["ready", "preview"]).has(evidenceStatus.dataState) || analysisState === "loading"} onClick={() => void analyze()}>{analysisState === "loading" ? "지역 자료 분석 중…" : evidenceStatus && new Set(["ready", "preview"]).has(evidenceStatus.dataState) ? "지역 인사이트 무료 분석" : "자료 준비 중"}<small>AI 크레딧 0 · 준비된 근거만 분석</small></button>
        </aside>
      </section> : detailedArea ? <div className="dm-region-select-prompt"><span aria-hidden="true">⌖</span><strong>{areaName}에서 시·군을 선택하세요.</strong><p>지도 또는 지역 목록을 이용할 수 있습니다.</p></div> : null}
    </>}

    {insight && selectedAnnouncement ? <RegionInsightPanel key={insight.insight.id} result={insight} announcement={selectedAnnouncement} onWrite={(context, announcement) => { trackEvent("proposal_angle_selected", { region_code: context.regionCode }); trackEvent("proposal_writing_started", { region_code: context.regionCode }); void onWrite(context, announcement); }} /> : null}
    <footer className="dm-region-map-source">지도 경계: 통계청 SGIS 기반 행정동 경계 가공물(admdongkor 2026-07-01, CC BY 4.0·공공누리 제1유형). 상세 출처와 라이선스는 저장소의 지도 데이터 문서를 확인하세요.</footer>
  </div>;
}
