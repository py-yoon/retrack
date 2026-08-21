/**
 * VWorld "(연속주제)_도시및주거환경정비/정비구역" SHP를 파싱해 검증된 정비구역
 * 경계 폴리곤을 src/lib/data/project-polygons.ts 에 기록한다.
 *
 * 원본: https://www.vworld.kr/dtmk/dtmk_ntads_s002.do?dsId=30335 (국토교통부)
 * 도시 및 주거환경정비법 제16조에 따라 지정·고시된 구역의 실측 경계다.
 *
 * 다운로드는 VWorld 로그인이 필요해 스크립트로 자동화할 수 없다. 수동으로
 * 로그인 후 서울 SHP(zip)를 받아 data/vworld/ 에 압축을 풀어둔 뒤 이 스크립트를
 * 실행한다. 원본 파일은 라이선스가 불명확해 저장소에는 커밋하지 않는다
 * (.gitignore의 /data/ 참고).
 *
 * Usage:
 *   node scripts/fetch-real-polygons.mjs [shp 파일 경로 접두어(확장자 제외)]
 *   기본값: data/vworld/LSMD_CONT_UD602_5174_11_202608
 */

import shapefile from "shapefile";
import proj4 from "proj4";
import { writeFile } from "node:fs/promises";

proj4.defs(
  "EPSG:5174",
  "+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43"
);

const inputBase = process.argv[2] ?? "data/vworld/LSMD_CONT_UD602_5174_11_202608";
const outputFile = "src/lib/data/project-polygons.ts";

function ringArea(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

// 정비구역이 여러 필지/블록으로 나뉜 MultiPolygon인 경우, 렌더러는 단일
// 외곽선만 그릴 수 있으므로 면적이 가장 큰 블록(대표 구역)을 선택한다.
function largestRing(geometry) {
  const rings = geometry.type === "Polygon" ? geometry.coordinates : geometry.coordinates.flat();
  return rings.reduce((best, ring) => (ringArea(ring) > ringArea(best) ? ring : best));
}

const source = await shapefile.open(`${inputBase}.shp`, `${inputBase}.dbf`, { encoding: "euc-kr" });

const best = new Map(); // 구역명 -> { area, ring }
let total = 0;
let result = await source.read();
while (!result.done) {
  total++;
  const { properties, geometry } = result.value;
  const name = (properties.REMARK && properties.REMARK.trim()) || (properties.ALIAS && properties.ALIAS.trim());
  // DBF에 소수 레코드가 EUC-KR이 아닌 다른 인코딩으로 들어있어 깨진 문자열이 생긴다.
  // 이름을 신뢰할 수 없으므로 매칭에 쓰지 않고 건너뛴다.
  const isMojibake = name && [...name].some((ch) => ch.charCodeAt(0) === 0xfffd || ch.charCodeAt(0) === 0xff1f);
  // REMARK/ALIAS에는 실제 구역명 대신 "자세한 사항은 ~과에 문의" 같은 행정 비고문이
  // 들어있는 경우가 있다. 사업장명과 절대 매칭될 수 없는 순수 잡음이라 제외한다.
  const looksLikeDistrictName = name && /구역|정비|재건축|재개발|지구|마을/.test(name);
  if (name && !isMojibake && looksLikeDistrictName) {
    const ring = largestRing(geometry);
    if (ring.length >= 4) {
      const area = ringArea(ring);
      const existing = best.get(name);
      if (!existing || area > existing.area) best.set(name, { area, ring });
    }
  }
  result = await source.read();
}

const entries = [...best.entries()]
  .sort(([a], [b]) => a.localeCompare(b, "ko"))
  .map(([name, { ring }]) => {
    const coords = ring
      .map(([x, y]) => {
        const [lng, lat] = proj4("EPSG:5174", "WGS84", [x, y]);
        return `    { lat: ${lat.toFixed(6)}, lng: ${lng.toFixed(6)} },`;
      })
      .join("\n");
    return `  ${JSON.stringify(name)}: [\n${coords}\n  ],`;
  });

const output = `export type Coord = { lat: number; lng: number };

/**
 * Verified redevelopment/reconstruction district boundary polygons, keyed by
 * project id / code / name. Sourced from VWorld "(연속주제)_도시및주거환경정비/
 * 정비구역" (국토교통부, https://www.vworld.kr/dtmk/dtmk_ntads_s002.do?dsId=30335)
 * — official 도시및주거환경정비법 제16조 지정·고시 경계, converted from
 * EPSG:5174 to WGS84 by scripts/fetch-real-polygons.mjs. Re-run that script
 * against a fresh VWorld SHP download to refresh this file.
 */
export const VERIFIED_REAL_POLYGONS: Record<string, Coord[]> = {
${entries.join("\n")}
};

/**
 * Returns exact verified real polygon coordinates if registered.
 * Supports matching by project ID, project Code, or normalized Project Name.
 * Returns null if no verified boundary data is available. (가상 추정 폴리곤 배제)
 */
export function getProjectPolygon(
  projectId: string,
  centerLat?: number,
  centerLng?: number
): Coord[] | null {
  if (VERIFIED_REAL_POLYGONS[projectId]) {
    return VERIFIED_REAL_POLYGONS[projectId];
  }

  // Name / keyword matching for major projects
  const norm = projectId.replaceAll(/\\s+/g, "").toLowerCase();
  for (const [key, coords] of Object.entries(VERIFIED_REAL_POLYGONS)) {
    if (norm.includes(key.toLowerCase()) || key.toLowerCase().includes(norm)) {
      return coords;
    }
  }

  return null;
}
`;

await writeFile(outputFile, output);
console.log(`정비구역 SHP ${total}건 중 이름이 있는 ${best.size}개 구역의 폴리곤을 ${outputFile} 에 기록했습니다.`);
