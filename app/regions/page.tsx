import type { Metadata } from "next";
import Link from "next/link";
import { indexablePublicRegions } from "../../lib/public-regions";

export const metadata: Metadata = {
  title: "지역별 지원사업과 정책 수요 | 당모",
  description: "실제 공식·통계·재정 근거가 준비된 지역의 모집 중 지원사업과 최근 정책 수요를 확인하세요.",
  alternates: { canonical: "/regions" },
};

export default async function RegionsPage() {
  const ready = await indexablePublicRegions();
  return <main className="dm-public-region-page"><nav><Link href="/">당모</Link><span> / 지역별 지원사업</span></nav><header><span>REGIONAL SUPPORT</span><h1>지역별 지원사업과 정책 수요</h1><p>실제 운영 근거가 분석 기준을 충족한 지역만 공개합니다. 준비되지 않은 지역을 문구만 바꿔 대량 생성하지 않습니다.</p><Link className="dm-primary-button" href="/app/map">지도로 탐색하기</Link></header><section><h2>운영 자료가 준비된 지역</h2>{ready.length ? <div className="dm-public-region-grid">{ready.map(({ region, summary }) => <Link href={`/regions/${region.path}`} key={region.code}><strong>{region.name}</strong><p>{summary.summary}</p><small>근거 {summary.evidenceStatus.documentCount}건 · 발행기관 {summary.evidenceStatus.publisherCount}곳</small></Link>)}</div> : <div className="dm-region-empty"><strong>현재 공개 기준을 충족한 지역을 준비 중입니다.</strong><p>수집원이 연결되고 실제 자료가 기준을 충족하면 이 목록에 자동으로 표시됩니다.</p></div>}</section></main>;
}
