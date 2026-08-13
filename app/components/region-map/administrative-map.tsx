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

export function AdministrativeMap({ asset, regions, selectedCode, overview = false, onSelect }: {
  asset: string;
  regions: RegionSummary[];
  selectedCode: string;
  overview?: boolean;
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

  const features = useMemo(() => collection ? prepare(collection) : [], [collection]);
  const byCode = useMemo(() => new Map(regions.map((region) => [region.code, region])), [regions]);

  if (error) return <div className="dm-region-map-state is-error" role="alert">{error}<small>아래 지역 목록으로 동일하게 탐색할 수 있습니다.</small></div>;
  if (!collection) return <div className="dm-region-map-state" role="status">행정경계 지도를 불러오는 중…</div>;

  return <div className="dm-administrative-map">
    <svg viewBox="0 0 700 640" role="img" aria-label={overview ? "대한민국 지도, 서울특별시와 경기도 선택 가능" : "선택 권역의 시군구별 모집 중 지원사업 지도"}>
      {features.map((feature) => {
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
            <text x={labelX} y={labelY - (overview ? 2 : 0)}>{overview ? region!.name.replace("특별시", "").replace("기도", "기") : count}</text>
            {overview ? <text className="dm-region-map-count" x={labelX} y={labelY + 15}>{count}건</text> : null}
          </> : null}
        </g>;
      })}
    </svg>
    <div className="dm-region-map-legend" aria-label="공고 수 색상 범례"><span><i className="is-level-1" />0건</span><span><i className="is-level-2" />1~2건</span><span><i className="is-level-3" />3~4건</span><span><i className="is-level-4" />5건 이상</span></div>
  </div>;
}
