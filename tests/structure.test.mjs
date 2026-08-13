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
