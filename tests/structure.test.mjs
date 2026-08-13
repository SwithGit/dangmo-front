import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("frontend owns UI and proxies API traffic", async () => {
  await assert.rejects(access(new URL("../app/api", import.meta.url)));
  const nextConfig = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");
  assert.match(nextConfig, /BACKEND_ORIGIN/);
  assert.match(nextConfig, /\/api\/:path\*/);
});

test("frontend does not contain Cloudflare runtime bindings", async () => {
  const files = [
    "../app/page.tsx",
    "../app/layout.tsx",
    "../lib/analytics.ts",
    "../lib/profile-options.ts",
  ];
  const source = (await Promise.all(files.map((file) => readFile(new URL(file, import.meta.url), "utf8")))).join("\n");
  assert.doesNotMatch(source, /cloudflare:workers|D1Database|R2Bucket/);
});

test("application menus use routable Next.js paths", async () => {
  const application = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const routePage = await readFile(new URL("../app/app/[[...route]]/page.tsx", import.meta.url), "utf8");
  assert.match(application, /usePathname/);
  assert.match(application, /window\.history\.pushState\(\{\}, "", targetPath\)/);
  assert.doesNotMatch(application, /router\.push\(targetPath/);
  assert.match(application, /\/app\/explore/);
  assert.match(application, /\/app\/profile\/business/);
  assert.match(routePage, /DangmoApplication/);
});

test("completed announcement sync refreshes the full feed and personalized recommendations", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /invalidateRecommendationCache\(\)/);
  assert.match(page, /announcementFeedUrl\(announcementRequestRef\.current, syncRun\.id\)/);
  assert.match(page, /const refreshedRecommendations = loadRecommendationPage\(1\)/);
});

test("paid plan UI matches backend entitlements and keeps live charges admin-gated", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /AI 프로필 버전 최대 2개/);
  assert.match(page, /AI 프로필 버전 최대 5개/);
  assert.match(page, /const isPaid = plan === "start" \|\| isPro/);
  assert.match(page, /live-admin-test/);
  assert.match(page, /관리자 실결제 시험/);
  assert.match(page, /partial_canceled/);
});

test("map exploration is routable, accessible, and keeps nationwide counts separate", async () => {
  const [page, view, map, list, insight, api] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/region-map/region-map-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/region-map/administrative-map.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/region-map/region-announcement-list.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/region-map/region-insight-panel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/region-map/region-map-api.ts", import.meta.url), "utf8"),
  ]);
  assert.match(page, /\| "map"/);
  assert.match(page, /label: "지도 탐색", view: "map"/);
  assert.ok(page.indexOf('label: "지원사업 탐색"') < page.indexOf('label: "지도 탐색"'));
  assert.ok(page.indexOf('label: "지도 탐색"') < page.indexOf('label: "맞춤 추천"'));
  assert.match(page, /path: "\/app\/map"/);
  assert.match(view, /korea-overview\.geojson/);
  assert.match(view, /DETAIL_AREA_ASSETS/);
  assert.match(view, /jeju-municipalities\.geojson/);
  assert.match(view, /gangwon-municipalities\.geojson/);
  assert.match(view, /jeonnam-gwangju-municipalities\.geojson/);
  assert.match(view, /aggregateRegion=\{selectedRegion\}/);
  assert.match(view, /dm-region-map-single/);
  assert.match(view, /gyeonggi-municipalities\.geojson/);
  assert.match(view, /광역시는 전체 단위로, 도 지역은 시·군 단위/);
  assert.match(view, /목록으로 보기/);
  assert.match(view, /popstate/);
  assert.match(map, /onKeyDown/);
  assert.match(map, /renderedFeatures/);
  assert.match(map, /feature\.properties\.regionCode === aggregateRegion\.code/);
  assert.match(map, /code === "11" \? 2/);
  assert.match(map, /aria-label=.*지역 대상 모집 중 공고/);
  assert.match(list, /전국 공통 지원사업/);
  assert.match(insight, /불확실성 안내/);
  assert.match(insight, /AI 크레딧/);
  assert.match(api, /\/api\/regions/);
});
