/**
 * VWorld 국토교통부 정비 관련 연속주제도 SHP들을 파싱해 검증된 구역 경계
 * 폴리곤을 src/lib/data/project-polygons.ts 에 기록한다. 두 데이터셋을 함께 쓴다:
 *
 *   - UD602 "(연속주제)_도시및주거환경정비/정비구역" (dsId=30335)
 *     도시 및 주거환경정비법 제16조에 따라 지정·고시된 구역
 *   - UD603 "(연속주제)_도시재정비/재정비촉진지구" (dsId=30337)
 *     도시재정비 촉진을 위한 특별법 제5조에 따라 지정하는 지구(뉴타운) — 단, 이
 *     데이터셋에도 한남뉴타운처럼 누락된 구역이 있다(VWorld 데이터 자체의 공백).
 *
 * 다운로드는 VWorld 로그인이 필요해 스크립트로 자동화할 수 없다. 수동으로
 * 로그인 후 https://www.vworld.kr/dtmk/dtmk_ntads_s001.do 에서 서울 SHP(zip)를
 * 받아 data/vworld/ 에 압축을 풀어둔 뒤 이 스크립트를 실행한다. 원본 파일은
 * 라이선스가 불명확해 저장소에는 커밋하지 않는다 (.gitignore의 /data/ 참고).
 *
 * Usage:
 *   node scripts/fetch-real-polygons.mjs [shp 파일 경로 접두어(확장자 제외)...]
 *   인자를 안 주면 data/vworld/ 에서 찾은 UD602, UD603 서울 SHP를 모두 사용한다.
 */

import shapefile from "shapefile";
import proj4 from "proj4";
import { writeFile } from "node:fs/promises";

proj4.defs(
  "EPSG:5174",
  "+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43"
);

const inputBases = process.argv.length > 2
  ? process.argv.slice(2)
  : [
      "data/vworld/LSMD_CONT_UD602_5174_11_202608",
      "data/vworld/LSMD_CONT_UD603_5174_11_202608",
    ];
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

// 정비/재건축/재개발 도메인에서 흔히 쓰이는 순수 범주어. REMARK/ALIAS에 구체적인
// 지명 없이 이 단어들만 조합돼 들어있는 레코드가 있는데("정비구역", "재정비촉진구역",
// "주택재개발" 등), 이런 이름은 실제 서울 어느 구역에도 붙일 수 있는 값이라 런타임의
// 부분일치 매칭과 만나면 완전히 엉뚱한 동네에 폴리곤이 뜬다(예: "한남3구역"이 원거리의
// 무명 "재정비촉진구역" 레코드와 매칭). 이 단어들을 모두 제거했을 때 지명/번지로 보이는
// 글자가 2자 이상 남지 않으면 지명이 없는 것으로 보고 제외한다.
const GENERIC_TOKENS = [
  "도시환경정비사업", "도시환경정비구역", "도시환경정비", "주택재건축정비구역", "주택재개발구역",
  "주택재건축사업", "주택재개발사업", "재건축사업정비구역", "재건축정비구역", "재개발정비구역",
  "재건축정비예정구역", "정비예정구역", "재정비촉진구역", "재정비촉진지구", "주거환경개선지구",
  "주거환경개선구역", "주거환경관리사업", "건축허가제한구역", "시장정비사업구역", "소단위관리지구",
  "특별건축구역", "주택재건축", "주택재개발", "재건축", "재개발", "도시환경", "정비구역", "정비사업",
  "정비계획", "지형도면", "지정", "고시", "수립", "구역", "지구", "사업", "정비", "마을",
  "행위제한", "입안", "문의", "주택과", "도시계획과", "도시재생과", "신속추진단", "허가", "제한",
  ":주택과", ":도시계획과", ":도시재생과", "_안", "(안)", "(", ")", "-", " ",
];
function stripGenericTokens(name) {
  let stripped = name;
  for (const token of GENERIC_TOKENS) stripped = stripped.split(token).join("");
  return stripped;
}

// VWorld UD603(재정비촉진지구) 원본에 REMARK/ALIAS가 비어 있는 레코드가 있다.
// 이 MNUM은 도형 중심좌표가 한남동(용산구, COL_ADM_SE=11170) 안에 들어오는 것을
// 직접 확인했고, 사용자가 한남뉴타운의 공식 명칭(한남재정비촉진지구, 하위
// 제1~5재정비촉진구역)을 확인해줬다. 도형은 국토부 원본 그대로이고 라벨만 채워
// 넣는 것이라 "추정 폴리곤"이 아니다. 다만 이 SHP에는 지구 전체 외곽선 하나만
// 있고 1~5구역 개별 경계로 나뉘어 있지 않아, 실제 DB 사업장명이 무엇이든 걸리도록
// 지구명과 구역별 이름 후보를 모두 같은 도형에 매핑해 둔다.
const MANUAL_NAME_OVERRIDES_BY_MNUM = {
  "61100001117020190362UDA1000001002": [
    "한남재정비촉진지구",
    "한남1구역", "한남 제1재정비촉진구역",
    "한남2구역", "한남 제2재정비촉진구역",
    "한남3구역", "한남 제3재정비촉진구역",
    "한남4구역", "한남 제4재정비촉진구역",
    "한남5구역", "한남 제5재정비촉진구역",
  ],
};

const best = new Map(); // 구역명 -> { area, ring }
let total = 0;
for (const inputBase of inputBases) {
  const source = await shapefile.open(`${inputBase}.shp`, `${inputBase}.dbf`, { encoding: "euc-kr" });
  let result = await source.read();
  while (!result.done) {
    total++;
    const { properties, geometry } = result.value;
    const name = (properties.REMARK && properties.REMARK.trim()) || (properties.ALIAS && properties.ALIAS.trim());
    const overrideNames = MANUAL_NAME_OVERRIDES_BY_MNUM[properties.MNUM];
    // DBF에 소수 레코드가 EUC-KR이 아닌 다른 인코딩으로 들어있어 깨진 문자열이 생긴다.
    // 이름을 신뢰할 수 없으므로 매칭에 쓰지 않고 건너뛴다.
    const isMojibake = name && [...name].some((ch) => ch.charCodeAt(0) === 0xfffd || ch.charCodeAt(0) === 0xff1f);
    // 두 조건을 모두 요구한다: (1) 정비/재건축 관련 단어가 있어야 하고 (2) 그 단어들을
    // 다 걷어내도 지명으로 보이는 글자가 남아야 한다. 하나만으로는 "입안", "행위제한",
    // "주택과문의" 같은 지명 없는 순수 행정 문구를 걸러내지 못한다.
    const hasDistrictKeyword = name && /구역|정비|재건축|재개발|지구|마을/.test(name);
    const hasSpecificPlaceName = name && hasDistrictKeyword && stripGenericTokens(name).length >= 2;
    if (overrideNames || (name && !isMojibake && hasSpecificPlaceName)) {
      const ring = largestRing(geometry);
      if (ring.length >= 4) {
        const area = ringArea(ring);
        for (const registeredName of overrideNames ?? [name]) {
          const existing = best.get(registeredName);
          if (!existing || area > existing.area) best.set(registeredName, { area, ring });
        }
      }
    }
    result = await source.read();
  }
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

  // Name / keyword matching for major projects. Keys shorter than 4 characters
  // are too generic to safely substring-match against arbitrary project names
  // (e.g. a bare category label matching an unrelated district by accident).
  const norm = projectId.replaceAll(/\\s+/g, "").toLowerCase();
  for (const [key, coords] of Object.entries(VERIFIED_REAL_POLYGONS)) {
    if (key.length < 4) continue;
    if (norm.includes(key.toLowerCase()) || key.toLowerCase().includes(norm)) {
      return coords;
    }
  }

  return null;
}
`;

await writeFile(outputFile, output);
console.log(`정비구역 SHP ${total}건 중 이름이 있는 ${best.size}개 구역의 폴리곤을 ${outputFile} 에 기록했습니다.`);
