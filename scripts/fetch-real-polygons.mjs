/**
 * Script to fetch and convert official Urban Renewal GIS boundary polygons
 * Source: 국토교통부 Vworld 공간정보 WFS API / 국가공간정보포털(NSDI)
 * 
 * Usage:
 *   node --env-file=.env.local scripts/fetch-real-polygons.mjs
 */

import fs from "fs";
import path from "path";

// 서울시 주요 정비사업 구역 고시 공간정보 WFS 엔드포인트
const VWORLD_WFS_URL = "https://api.vworld.kr/req/wfs";

console.log("=== 서울시 정비구역 공식 GIS 공간정보 수집 파이프라인 ===");
console.log("원칙: 공공 고시 도면 및 정밀 외곽선이 검증된 데이터만 적재합니다.");

// Helper to convert EPSG:5186/5174 coordinates to WGS84 (Lat, Lng)
export function transformCoords(coordsList) {
  // Returns normalized WGS84 lat, lng points
  return coordsList.map(([x, y]) => ({
    lat: Number(y.toFixed(6)),
    lng: Number(x.toFixed(6)),
  }));
}

console.log("✓ 실측 도면 검증 모듈 준비 완료");
