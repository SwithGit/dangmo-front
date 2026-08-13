"use client";

import { useEffect, useMemo, useState } from "react";
import type { GeoFeatureCollection, RegionSummary } from "./region-map-types";

type PreparedFeature = {
  code: string;
  name: string;
  path: string;
  x: number;
  y: number;
};

function prepare(collection: GeoFeatureCollection): PreparedFeature[] {
  const points = collection.features.flatMap((feature) => feature.geometry.coordinates.flat(2) as unknown as number[][]);
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const width = Math.max(0.001, maxX - minX), height = Math.max(0.001, maxY - minY);
  const project = ([x, y]: number[]) => [30 + ((x - minX) / width) * 640, 25 + ((maxY - y) / height) * 590];
  return collection.features.map((feature) => {
    const featurePoints = feature.geometry.coordinates.flat(2) as unknown as number[][];
    const projected = featurePoints.map(project);
    const featureXs = projected.map((point) => point[0]);
    const featureYs = projected.map((point) => point[1]);
    const path = feature.geometry.coordinates.map((polygon) => polygon.map((ring) => ring.map((point, index) => {
      const [x, y] = project(point);
      return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ") + " Z").join(" ")).join(" ");
    return {
      code: feature.properties.regionCode,
      name: feature.properties.name,
      path,
      x: (Math.min(...featureXs) + Math.max(...featureXs)) / 2,
      y: (Math.min(...featureYs) + Math.max(...featureYs)) / 2,
    };
  });
}

function levelClass(count: number) {
  if (count >= 5) return "is-level-4";
  if (count >= 3) return "is-level-3";
  if (count >= 1) return "is-level-2";
  return "is-level-1";
}

function shortRegionName(name: string) {
  return ({
    서울특별시: "서울", 부산광역시: "부산", 대구광역시: "대구", 인천광역시: "인천",
    전남광주통합특별시: "전남·광주", 대전광역시: "대전", 울산광역시: "울산", 세종특별자치시: "세종",
    경기도: "경기", 강원특별자치도: "강원", 충청북도: "충북", 충청남도: "충남",
    경상북도: "경북", 경상남도: "경남", 제주특별자치도: "제주", 전북특별자치도: "전북",
  } as Record<string, string>)[name] ?? name;
}

export function AdministrativeMap({ asset, regions, selectedCode, overview = false, aggregateRegion, onSelect }: {
  asset: string;
  regions: RegionSummary[];
  selectedCode: string;
  overview?: boolean;
  aggregateRegion?: RegionSummary;
  onSelect: (region: RegionSummary) => void;
}) {
  const [collection, setCollection] = useState<GeoFeatureCollection | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch(asset).then((response) => {
      if (!response.ok) throw new Error("지도 자산을 불러오지 못했습니다.");
      return response.json() as Promise<GeoFeatureCollection>;
    }).then((payload) => { if (active) setCollection(payload); })
      .catch((nextError) => { if (active) setError(nextError instanceof Error ? nextError.message : "지도를 불러오지 못했습니다."); });
    return () => { active = false; };
  }, [asset]);

  const features = useMemo(() => {
    if (!collection) return [];
    if (!aggregateRegion) return prepare(collection);
    const matching = collection.features.filter((feature) => feature.properties.regionCode === aggregateRegion.code);
    return prepare(matching.length ? { ...collection, features: matching } : collection);
  }, [aggregateRegion, collection]);
  const byCode = useMemo(() => new Map(regions.map((region) => [region.code, region])), [regions]);
  const renderedFeatures = useMemo(() => overview ? [...features].sort((left, right) => {
    const rank = (code: string) => code === "11" ? 2 : code === "41" ? 1 : 0;
    return rank(left.code) - rank(right.code);
  }) : features, [features, overview]);
  const aggregateLabel = useMemo(() => features.length ? {
    x: features.reduce((sum, feature) => sum + feature.x, 0) / features.length,
    y: features.reduce((sum, feature) => sum + feature.y, 0) / features.length,
  } : { x: 350, y: 320 }, [features]);

  if (error) return <div className="dm-region-map-state is-error" role="alert">{error}<small>아래 지역 목록으로 동일하게 탐색할 수 있습니다.</small></div>;
  if (!collection) return <div className="dm-region-map-state" role="status">행정경계 지도를 불러오는 중…</div>;

  if (aggregateRegion) {
    const count = aggregateRegion.regionalOpenCount;
    return <div className="dm-administrative-map">
      <svg viewBox="0 0 700 640" role="img" aria-label={`${aggregateRegion.name} 전체 지도, 지역 대상 모집 중 공고 ${count}건`}>
        <g className={`dm-region-shape ${levelClass(count)} is-selected`} role="button" tabIndex={0}
          aria-label={`${aggregateRegion.name}, 지역 대상 모집 중 공고 ${count}건`}
          onClick={() => onSelect(aggregateRegion)}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(aggregateRegion); } }}>
          {features.map((feature) => <path d={feature.path} vectorEffect="non-scaling-stroke" key={feature.code} />)}
          <circle cx={aggregateLabel.x} cy={aggregateLabel.y} r={22} />
          <text x={aggregateLabel.x} y={aggregateLabel.y - 2}>{shortRegionName(aggregateRegion.name)}</text>
          <text className="dm-region-map-count" x={aggregateLabel.x} y={aggregateLabel.y + 15}>{count}건</text>
        </g>
      </svg>
      <div className="dm-region-map-legend" aria-label="공고 수 색상 범례"><span><i className="is-level-1" />0건</span><span><i className="is-level-2" />1~2건</span><span><i className="is-level-3" />3~4건</span><span><i className="is-level-4" />5건 이상</span></div>
    </div>;
  }

  return <div className="dm-administrative-map">
    <svg viewBox="0 0 700 640" role="img" aria-label={overview ? "대한민국 지도, 전국 시·도 선택 가능" : "선택 권역의 시군별 모집 중 지원사업 지도"}>
      {renderedFeatures.map((feature) => {
        const region = byCode.get(feature.code);
        const enabled = Boolean(region?.supported);
        const count = region?.regionalOpenCount ?? 0;
        const selected = selectedCode === feature.code;
        const labelX = overview && feature.code === "11" ? feature.x + 72 : overview && feature.code === "41" ? feature.x - 58 : feature.x;
        const labelY = overview && feature.code === "11" ? feature.y - 62 : overview && feature.code === "41" ? feature.y + 52 : feature.y;
        return <g
          className={`dm-region-shape ${enabled ? levelClass(count) : "is-disabled"}${selected ? " is-selected" : ""}`}
          key={feature.code}
          role={enabled ? "button" : undefined}
          tabIndex={enabled ? 0 : undefined}
          aria-label={enabled ? `${region!.name}, 지역 대상 모집 중 공고 ${count}건` : `${feature.name}, 준비 중`}
          aria-pressed={enabled ? selected : undefined}
          onClick={() => { if (region) onSelect(region); }}
          onKeyDown={(event) => {
            if (region && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onSelect(region); }
          }}
        >
          <path d={feature.path} vectorEffect="non-scaling-stroke" />
          {enabled ? <>
            {overview ? <line className="dm-region-leader" x1={feature.x} y1={feature.y} x2={labelX} y2={labelY} /> : null}
            <circle cx={labelX} cy={labelY} r={overview ? 24 : 13} />
            <text x={labelX} y={labelY - (overview ? 2 : 0)}>{overview ? shortRegionName(region!.name) : count}</text>
            {overview ? <text className="dm-region-map-count" x={labelX} y={labelY + 15}>{count}건</text> : null}
          </> : null}
        </g>;
      })}
    </svg>
    <div className="dm-region-map-legend" aria-label="공고 수 색상 범례"><span><i className="is-level-1" />0건</span><span><i className="is-level-2" />1~2건</span><span><i className="is-level-3" />3~4건</span><span><i className="is-level-4" />5건 이상</span></div>
  </div>;
}
