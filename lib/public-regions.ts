export type PublicRegion = { code: string; name: string; path: string };

const regions: PublicRegion[] = [
  ["11", "서울특별시", "seoul"], ["26", "부산광역시", "busan"], ["27", "대구광역시", "daegu"],
  ["28", "인천광역시", "incheon"], ["12", "전남광주통합특별시", "jeonnam-gwangju"], ["30", "대전광역시", "daejeon"],
  ["31", "울산광역시", "ulsan"], ["36", "세종특별자치시", "sejong"], ["51", "강원특별자치도", "gangwon"],
  ["43", "충청북도", "chungbuk"], ["44", "충청남도", "chungnam"], ["47", "경상북도", "gyeongbuk"],
  ["48", "경상남도", "gyeongnam"], ["50", "제주특별자치도", "jeju"], ["52", "전북특별자치도", "jeonbuk"],
  ["41110", "수원시", "gyeonggi/suwon"], ["41130", "성남시", "gyeonggi/seongnam"], ["41150", "의정부시", "gyeonggi/uijeongbu"],
  ["41170", "안양시", "gyeonggi/anyang"], ["41190", "부천시", "gyeonggi/bucheon"], ["41210", "광명시", "gyeonggi/gwangmyeong"],
  ["41220", "평택시", "gyeonggi/pyeongtaek"], ["41250", "동두천시", "gyeonggi/dongducheon"], ["41270", "안산시", "gyeonggi/ansan"],
  ["41280", "고양시", "gyeonggi/goyang"], ["41290", "과천시", "gyeonggi/gwacheon"], ["41310", "구리시", "gyeonggi/guri"],
  ["41360", "남양주시", "gyeonggi/namyangju"], ["41370", "오산시", "gyeonggi/osan"], ["41390", "시흥시", "gyeonggi/siheung"],
  ["41410", "군포시", "gyeonggi/gunpo"], ["41430", "의왕시", "gyeonggi/uiwang"], ["41450", "하남시", "gyeonggi/hanam"],
  ["41460", "용인시", "gyeonggi/yongin"], ["41480", "파주시", "gyeonggi/paju"], ["41500", "이천시", "gyeonggi/icheon"],
  ["41550", "안성시", "gyeonggi/anseong"], ["41570", "김포시", "gyeonggi/gimpo"], ["41590", "화성시", "gyeonggi/hwaseong"],
  ["41610", "광주시", "gyeonggi/gwangju"], ["41630", "양주시", "gyeonggi/yangju"], ["41650", "포천시", "gyeonggi/pocheon"],
  ["41670", "여주시", "gyeonggi/yeoju"], ["41800", "연천군", "gyeonggi/yeoncheon"], ["41820", "가평군", "gyeonggi/gapyeong"],
  ["41830", "양평군", "gyeonggi/yangpyeong"],
].map(([code, name, path]) => ({ code, name, path }));

export const PUBLIC_REGIONS = regions;
export function publicRegionFromSegments(segments: string[]) { return regions.find((region) => region.path === segments.join("/")) ?? null; }

export type PublicRegionSummary = {
  publishable: boolean;
  summary?: string;
  lastModified?: string;
  evidenceStatus: { dataState: string; documentCount: number; publisherCount: number; officialDocumentCount: number; lastPublishedAt: string | null };
  announcements?: Array<{ id: string; title: string; institution: string; category: string; target: string; sourceUrl: string; applyEndAt: string; regionLimitLabel?: string | null }>;
  issues?: Array<{ id: string; title: string; summary: string; confidence: string; evidenceIds: string[] }>;
  evidence?: Array<{ id: string; title: string; publisher: string; sourceType: string; publishedAt: string; sourceUrl: string; scope: string; detailRegionLabel: string | null; extractedFacts: string[] }>;
};

function backendOrigin() { return (process.env.BACKEND_ORIGIN || "http://127.0.0.1:4000").replace(/\/$/, ""); }
export async function fetchPublicRegionSummary(region: PublicRegion): Promise<PublicRegionSummary | null> {
  try {
    const response = await fetch(`${backendOrigin()}/api/regions/${region.code}/public-summary`, { next: { revalidate: 600 } });
    if (!response.ok) return null;
    return await response.json() as PublicRegionSummary;
  } catch { return null; }
}

export async function indexablePublicRegions() {
  const summaries = await Promise.all(regions.map(async (region) => ({ region, summary: await fetchPublicRegionSummary(region) })));
  return summaries.filter((item) => item.summary?.publishable && item.summary.evidenceStatus.dataState === "ready") as Array<{ region: PublicRegion; summary: PublicRegionSummary }>;
}
