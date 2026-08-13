export type RegionSummary = {
  code: string;
  name: string;
  level: "province" | "municipality";
  parentCode: string | null;
  supported: boolean;
  geometryVersion: string;
  regionalOpenCount: number;
  nationwideOpenCount: number;
  closestDeadline: string | null;
};

export type RegionsPayload = {
  generatedAt: string;
  previewData: boolean;
  regions: RegionSummary[];
};

export type RegionalAnnouncement = {
  id: string;
  title: string;
  institution: string;
  category: string;
  target: string;
  sourceUrl: string;
  sourceLabel: string;
  applyEndAt: string;
  publishedAt: string;
  scope: "nationwide" | "province" | "municipality" | "unsupported";
  regionCodes: string[];
  previewData: boolean;
};

export type RegionAnnouncementsPayload = {
  region: Pick<RegionSummary, "code" | "name" | "level" | "parentCode">;
  previewData: boolean;
  regionalAnnouncements: RegionalAnnouncement[];
  provinceAnnouncements?: RegionalAnnouncement[];
  nationwideAnnouncements: RegionalAnnouncement[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  closestDeadline: string | null;
};

export type RegionInsight = {
  id: string;
  region: { code: string; name: string };
  analysisUnit: { id: string; name: string; kind: "metro" | "municipality"; memberRegionCodes: string[] };
  announcement: { id: string; title: string };
  status: "ready" | "insufficient_evidence" | "analysis_failed";
  summary: string;
  issues: Array<{ id: string; title: string; summary: string; scope: "unit_wide" | "district_case" | "province_context"; trend: "rising" | "stable" | "declining" | "mixed"; score: number; confidence: "high" | "medium" | "low"; limitations: string[]; evidenceIds: string[] }>;
  proposalAngles: Array<{ id: string; title: string; regionalProblem: string; proposedSolution: string; announcementFit: string; businessFit: string; rationale: string; beneficiaries: string[]; executionPlan: string[]; suggestedMetrics: string[]; cautions: string[]; evidenceIds: string[]; fitScore: number }>;
  evidence: Array<{ id: string; title: string; publisher: string; sourceType: string; publishedAt: string; sourceUrl: string; summary: string; scope: "unit_wide" | "district_case" | "province_context"; detailRegionLabel: string | null; regionRelevanceScore: number; sourceQualityScore: number; previewData: boolean }>;
  readiness: { ready: boolean; documentCount: number; publisherCount: number; officialDocumentCount: number; recentDocumentCount: number; directDocumentCount: number; missing: string[] };
  lookbackMonths: number;
  analyzedAt: string;
  expiresAt: string;
  previewData: boolean;
  uncertaintyNotice: string;
};

export type RegionInsightResponse = {
  insight: RegionInsight;
  billing: { creditCost: number; chargedCredits: number; remainingCredits: number | null; pricingMode: "test-free" | "paid"; cacheHit: boolean; issueCacheHit?: boolean };
};

export type RegionalWritingContext = {
  regionCode: string;
  regionInsightId: string;
  proposalAngleId: string;
  announcementId: string;
  regionName: string;
  proposalAngleTitle: string;
};

export type GeoFeatureCollection = {
  type: "FeatureCollection";
  geometryVersion: string;
  features: Array<{
    type: "Feature";
    properties: { regionCode: string; name: string };
    geometry: { type: "MultiPolygon"; coordinates: number[][][][] };
  }>;
};
