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
  announcement: { id: string; title: string };
  status: "ready" | "insufficient_evidence";
  summary: string;
  issues: Array<{ title: string; summary: string; confidence: "high" | "medium" | "low"; evidenceIds: string[] }>;
  proposalAngles: Array<{ id: string; title: string; rationale: string; beneficiaries: string[]; suggestedMetrics: string[]; cautions: string[]; evidenceIds: string[] }>;
  evidence: Array<{ id: string; title: string; publisher: string; sourceType: "official" | "plan" | "council" | "statistics" | "news"; publishedAt: string; sourceUrl: string }>;
  lookbackMonths: number;
  analyzedAt: string;
  expiresAt: string;
  previewData: boolean;
  uncertaintyNotice: string;
};

export type RegionInsightResponse = {
  insight: RegionInsight;
  billing: { creditCost: number; chargedCredits: number; remainingCredits: number | null; pricingMode: "test-free" | "paid"; cacheHit: boolean };
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
