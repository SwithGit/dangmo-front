import type { RegionAnnouncementsPayload, RegionalEvidenceStatus, RegionInsightResponse, RegionsPayload } from "./region-map-types";

async function json<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) {
    const error = new Error(payload.error || "요청을 완료하지 못했습니다.");
    Object.assign(error, { status: response.status });
    throw error;
  }
  return payload;
}

export async function loadRegions(parentCode?: string) {
  const suffix = parentCode ? `?parentCode=${encodeURIComponent(parentCode)}` : "?scope=nationwide";
  return json<RegionsPayload>(await fetch(`/api/regions${suffix}`, { headers: { Accept: "application/json" } }));
}

export async function loadRegionAnnouncements(regionCode: string, sort: string) {
  return json<RegionAnnouncementsPayload>(await fetch(`/api/regions/${encodeURIComponent(regionCode)}/announcements?page=1&pageSize=50&sort=${encodeURIComponent(sort)}`, { headers: { Accept: "application/json" } }));
}

export async function loadRegionalEvidenceStatus(regionCode: string) {
  return json<RegionalEvidenceStatus>(await fetch(`/api/regions/${encodeURIComponent(regionCode)}/evidence-status`, { headers: { Accept: "application/json" } }));
}

export async function requestRegionInsight(regionCode: string, announcementId: string) {
  return json<RegionInsightResponse>(await fetch(`/api/regions/${encodeURIComponent(regionCode)}/insights`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ announcementId, lookbackMonths: 12 }),
  }));
}
