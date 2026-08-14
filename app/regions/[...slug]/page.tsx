import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchPublicRegionSummary, publicRegionFromSegments } from "../../../lib/public-regions";

type Props = { params: Promise<{ slug: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const region = publicRegionFromSegments((await params).slug); if (!region) return { title: "지역을 찾을 수 없습니다 | 당모", robots: { index: false, follow: false } };
  const data = await fetchPublicRegionSummary(region); const ready = Boolean(data?.publishable && data.evidenceStatus.dataState === "ready");
  return { title: `${region.name} 지원사업과 지역 정책 수요 | 당모`, description: ready ? data?.summary : `${region.name}의 공식 지역자료를 준비하고 있습니다.`, alternates: { canonical: `/regions/${region.path}` }, robots: ready ? { index: true, follow: true } : { index: false, follow: false }, openGraph: { type: "website", url: `/regions/${region.path}`, title: `${region.name} 지원사업과 지역 정책 수요`, description: ready ? data?.summary : "지역자료 준비 중", images: ["/dangmo-icon.png"] } };
}

export default async function PublicRegionPage({ params }: Props) {
  const region = publicRegionFromSegments((await params).slug); if (!region) notFound();
  const data = await fetchPublicRegionSummary(region); if (!data) notFound();
  const ready = data.publishable && data.evidenceStatus.dataState === "ready";
  const breadcrumb = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "홈", item: "https://dangmo.kr/" }, { "@type": "ListItem", position: 2, name: "지역별 지원사업", item: "https://dangmo.kr/regions" }, { "@type": "ListItem", position: 3, name: region.name, item: `https://dangmo.kr/regions/${region.path}` }] };
  if (!ready) return <main className="dm-public-region-page"><nav><Link href="/regions">지역별 지원사업</Link><span> / {region.name}</span></nav><header><h1>{region.name} 지역자료 준비 중</h1><p>공식자료·통계·지역뉴스 수집과 근거 검증이 완료된 뒤 공개합니다.</p><Link className="dm-primary-button" href="/app/map">지도에서 공고 보기</Link></header></main>;
  return <main className="dm-public-region-page"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c") }} /><nav><Link href="/regions">지역별 지원사업</Link><span> / {region.name}</span></nav><header><span>VERIFIED REGIONAL DATA</span><h1>{region.name} 지원사업과 지역 정책 수요</h1><p>{data.summary}</p><small>자료 기준일 {new Date(data.lastModified!).toLocaleDateString("ko-KR")} · 실제 근거 {data.evidenceStatus.documentCount}건</small><Link className="dm-primary-button" href={`/app/map?area=${region.code.length === 2 ? region.code : "gyeonggi"}${region.code.length > 2 ? `&region=${region.code}` : ""}`}>로그인 후 지역 인사이트 분석</Link></header><section><h2>모집 중 지역 지원사업</h2><div className="dm-public-region-grid">{data.announcements?.map((item) => <a href={item.sourceUrl} target="_blank" rel="noreferrer" key={item.id}><span>{item.regionLimitLabel ?? item.category}</span><strong>{item.title}</strong><p>{item.institution} · {item.target}</p><small>{new Date(item.applyEndAt).toLocaleDateString("ko-KR")} 마감</small></a>)}</div></section>{data.issues?.length ? <section><h2>최근 지역 현안</h2><div className="dm-public-region-grid">{data.issues.map((issue) => <article key={issue.id}><strong>{issue.title}</strong><p>{issue.summary}</p><small>근거 {issue.evidenceIds.length}건 · 신뢰도 {issue.confidence}</small></article>)}</div></section> : null}<section><h2>공식·통계 근거</h2><div className="dm-public-region-grid">{data.evidence?.map((item) => <a href={item.sourceUrl} target="_blank" rel="noreferrer" key={item.id}><span>{item.sourceType} · {item.scope}</span><strong>{item.title}</strong><p>{item.extractedFacts?.[0] ?? item.publisher}</p><small>{item.publisher} · {new Date(item.publishedAt).toLocaleDateString("ko-KR")}{item.detailRegionLabel ? ` · ${item.detailRegionLabel}` : ""}</small></a>)}</div></section></main>;
}
