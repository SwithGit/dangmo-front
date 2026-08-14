import type { MetadataRoute } from "next";
import { indexablePublicRegions } from "../lib/public-regions";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ready = await indexablePublicRegions();
  const staticPages: MetadataRoute.Sitemap = [
    { url: "https://dangmo.kr/", changeFrequency: "daily", priority: 1 },
    { url: "https://dangmo.kr/business", changeFrequency: "monthly", priority: 0.7 },
    { url: "https://dangmo.kr/pricing", changeFrequency: "monthly", priority: 0.7 },
    { url: "https://dangmo.kr/regions", changeFrequency: "daily", priority: 0.8 },
  ];
  return [...staticPages, ...ready.map(({ region, summary }) => ({ url: `https://dangmo.kr/regions/${region.path}`, lastModified: summary.lastModified ? new Date(summary.lastModified) : undefined, changeFrequency: "weekly" as const, priority: 0.7 }))];
}
