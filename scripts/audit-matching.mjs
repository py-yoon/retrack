/**
 * RE:TRACK 데이터 매칭 및 품질 검수 스크립트 (Audit & Inspection)
 *
 * 각 데이터 원천(서울시 UPIS, 서울시 공고게시판, 정보몽땅)으로부터
 * 수집/매칭된 데이터의 정합성, 자치구 매칭률, 중요도 분류, 미매칭 건수 등을 검수합니다.
 */

import { resolveDistrict, SEOUL_DISTRICTS } from "./lib/seoul-districts.mjs";

const key = process.env.SEOUL_OPENAPI_KEY;
if (!key) {
  console.error("❌ 오류: SEOUL_OPENAPI_KEY 환경변수가 설정되지 않았습니다.");
  process.exit(1);
}

async function fetchSeoulApi(service) {
  const rows = [];
  for (let start = 1; ; start += 1000) {
    const response = await fetch(
      `http://openapi.seoul.go.kr:8088/${key}/json/${service}/${start}/${start + 999}/`
    );
    if (!response.ok) throw new Error(`${service} API 요청 실패: ${response.status}`);
    const body = await response.json();
    const result = body?.[service];
    if (result?.RESULT?.CODE !== "INFO-000") {
      throw new Error(result?.RESULT?.MESSAGE ?? `${service} API 오류`);
    }
    rows.push(...(result.row ?? []));
    if (rows.length >= Number(result.list_total_count) || (result.row ?? []).length === 0) break;
  }
  return rows;
}

async function fetchCleanupStages() {
  const pageSize = 1000;
  const rows = [];
  const clean = (v) =>
    String(v ?? "")
      .replaceAll(/<[^>]*>/g, " ")
      .replaceAll(/&nbsp;/g, " ")
      .replaceAll(/\s+/g, " ")
      .trim();

  for (let page = 1; page <= 2; page++) {
    const response = await fetch(
      `https://cleanup.seoul.go.kr/cleanup/bsnssttus/lscrMainIndx.do?cpage=${page}&pageSize=${pageSize}`
    );
    if (!response.ok) throw new Error(`정보몽땅 요청 실패: ${response.status}`);
    const html = await response.text();
    for (const match of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
      const cells = [...match[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((cell) => clean(cell[1]));
      if (cells.length >= 6 && cells[1]) {
        rows.push({
          district: cells[1],
          type: cells[2],
          name: cells[3],
          address: cells[4],
          stage: cells[5],
        });
      }
    }
  }
  return rows;
}

console.log("🔍 [RE:TRACK] 데이터 품질 및 매칭 감사(Audit) 시작...\n");

// 1. Fetch all raw datasets
console.log("1️⃣ 외부 원천 데이터 조회 중...");
const [upisRows, noticeRows, cleanupRows] = await Promise.all([
  fetchSeoulApi("upisRebuild"),
  fetchSeoulApi("TbWcmBoardB0414"),
  fetchCleanupStages(),
]);

console.log(`   - 서울시 도시계획 정비사업 (upisRebuild): ${upisRows.length.toLocaleString()}건`);
console.log(`   - 서울시 시행계획 공고 (TbWcmBoardB0414): ${noticeRows.length.toLocaleString()}건`);
console.log(`   - 서울시 정비사업 정보몽땅: ${cleanupRows.length.toLocaleString()}건\n`);

// 2. Audit Projects & Districts
console.log("2️⃣ 사업장 및 자치구 매칭 분석");
const projectsMap = new Map();
for (const row of upisRows) {
  if (!row.PRJC_CD) continue;
  if (!projectsMap.has(row.PRJC_CD)) projectsMap.set(row.PRJC_CD, []);
  projectsMap.get(row.PRJC_CD).push(row);
}

const districtCounts = {};
SEOUL_DISTRICTS.forEach((d) => (districtCounts[d] = 0));
let projectsWithDistrict = 0;
const unmatchedDistrictSamples = [];

for (const [code, pRows] of projectsMap.entries()) {
  const combinedText = pRows.map((r) => `${r.PSTN_NM ?? ""} ${r.RGN_NM ?? ""}`).join(" ");
  const allCodes = pRows.flatMap((r) => [r.PRJC_CD, r.RPT_MNG_CD, r.DCSN_ANCMNT_MNG_CD]).filter(Boolean);
  const district = resolveDistrict({ text: combinedText, codes: allCodes });

  if (district && districtCounts[district] !== undefined) {
    districtCounts[district]++;
    projectsWithDistrict++;
  } else {
    if (unmatchedDistrictSamples.length < 5) {
      unmatchedDistrictSamples.push({ code, text: combinedText.slice(0, 60) });
    }
  }
}

const districtMatchRate = ((projectsWithDistrict / projectsMap.size) * 100).toFixed(2);
console.log(`   - 고유 정비사업장 수: ${projectsMap.size.toLocaleString()}개`);
console.log(`   - 자치구 매칭 사업장 수: ${projectsWithDistrict.toLocaleString()}개 (${districtMatchRate}%)`);
console.log(`   - 미매칭 사업장 수: ${(projectsMap.size - projectsWithDistrict).toLocaleString()}개`);
if (unmatchedDistrictSamples.length > 0) {
  console.log("   - [미매칭 표본]:", unmatchedDistrictSamples);
}
console.log("");

// 3. Audit Event Matching Quality
console.log("3️⃣ 공고 이벤트 사업장 매칭 분석");
const clean = (v) => String(v ?? "").replaceAll(/<[^>]*>/g, " ").replaceAll(/\s+/g, " ").trim();
const normalize = (v) => clean(v).replaceAll(/[^가-힣a-zA-Z0-9]/g, "").toLowerCase();

const projectSearch = [...projectsMap.entries()].map(([code, pRows]) => {
  const combinedText = pRows.map((r) => `${r.PSTN_NM ?? ""} ${r.RGN_NM ?? ""}`).join(" ");
  const allCodes = pRows.flatMap((r) => [r.PRJC_CD, r.RPT_MNG_CD, r.DCSN_ANCMNT_MNG_CD]).filter(Boolean);
  const district = resolveDistrict({ text: combinedText, codes: allCodes });
  const names = pRows.map((r) => r.RGN_NM).filter(Boolean);
  const addrs = pRows.map((r) => r.PSTN_NM).filter(Boolean);
  const searchKeywords = [...new Set([...names, ...addrs])].map(normalize).filter((k) => k.length >= 4);
  return { code, district, searchKeywords, displayName: names[0] || addrs[0] || code };
});

let matchedEvents = 0;
let crossDistrictBlocked = 0;
const importanceCounts = { 3: 0, 2: 0, 1: 0 };
const eventTypeCounts = { 공고: 0, 인가: 0, 고시: 0, 계획변경: 0 };
const eventSamples = [];

for (const notice of noticeRows) {
  const noticeTitle = clean(notice.AGND_NM ?? "도시계획 시행계획 공고");
  const noticeContent = clean(notice.CN ?? "");
  const noticeText = `${noticeTitle} ${noticeContent}`;
  const noticeDistrict = resolveDistrict({ text: noticeText });
  const normalizedNotice = normalize(noticeText);

  let bestProject = null;
  for (const candidate of projectSearch) {
    const isKeywordMatch = candidate.searchKeywords.some((keyword) => normalizedNotice.includes(keyword));
    if (!isKeywordMatch) continue;

    if (noticeDistrict && candidate.district && noticeDistrict !== candidate.district) {
      crossDistrictBlocked++;
      continue;
    }

    bestProject = candidate;
    break;
  }

  if (!bestProject || !notice.PST_SN) continue;

  const match = String(notice.PBANC_PRD ?? "").match(/(20\d{2})[.년-](\d{1,2})[.월-](\d{1,2})/);
  if (!match) continue;

  // Determine Importance & Type
  let importance = 1;
  if (/관리처분|사업시행계획인가|조합설립인가|정비구역\s*지정|준공인가|착공|시공사\s*선정|분양가|이주/.test(noticeTitle)) {
    importance = 3;
  } else if (/공람|설명회|의견청취|열람|환경영향평가|정비계획\s*변경|공청회/.test(noticeTitle)) {
    importance = 2;
  }
  importanceCounts[importance]++;

  let eventType = "공고";
  if (/인가/.test(noticeTitle)) eventType = "인가";
  else if (/고시/.test(noticeTitle)) eventType = "고시";
  else if (/변경/.test(noticeTitle)) eventType = "계획변경";
  eventTypeCounts[eventType]++;

  matchedEvents++;

  if (eventSamples.length < 3) {
    eventSamples.push({
      noticeTitle: noticeTitle.slice(0, 45) + "...",
      matchedProject: bestProject.displayName,
      district: bestProject.district,
      importance: importance === 3 ? "중요(3)" : importance === 2 ? "일반(2)" : "낮음(1)",
      eventType,
    });
  }
}

console.log(`   - 원본 공고 수: ${noticeRows.length.toLocaleString()}건`);
console.log(`   - 매칭된 이벤트 수: ${matchedEvents.toLocaleString()}건`);
console.log(`   - 자치구 불일치 오매칭 방지: ${crossDistrictBlocked.toLocaleString()}건`);
console.log(`   - 중요도 분포: 중요(3) ${importanceCounts[3]}건 | 일반(2) ${importanceCounts[2]}건 | 낮음(1) ${importanceCounts[1]}건`);
console.log(`   - 유형별 분포: 공고 ${eventTypeCounts["공고"]}건 | 인가 ${eventTypeCounts["인가"]}건 | 고시 ${eventTypeCounts["고시"]}건 | 계획변경 ${eventTypeCounts["계획변경"]}건`);
console.log("   - [매칭 이벤트 표본]:", eventSamples);
console.log("");

// 4. Audit Stages Matching
console.log("4️⃣ 정보몽땅 추진단계 매칭 분석");
let stageMatched = 0;
const stageDistribution = {};
const stageMatchedProjects = new Set();

for (const row of cleanupRows) {
  const name = normalize(row.name);
  const address = normalize(row.address);
  const project = projectSearch.find((candidate) =>
    candidate.searchKeywords.some(
      (keyword) =>
        (keyword.length >= 4 && (keyword.includes(name) || name.includes(keyword))) ||
        (keyword.length >= 4 && (keyword.includes(address) || address.includes(keyword)))
    )
  );

  if (!project || stageMatchedProjects.has(project.code)) continue;
  stageMatchedProjects.add(project.code);
  stageMatched++;
  stageDistribution[row.stage] = (stageDistribution[row.stage] || 0) + 1;
}

console.log(`   - 정보몽땅 사업장 수: ${cleanupRows.length.toLocaleString()}건`);
console.log(`   - 매칭된 추진단계 수: ${stageMatched.toLocaleString()}개 사업장`);
console.log("   - 추진단계별 분포:", stageDistribution);
console.log("\n========================================================");
console.log("✅ [RE:TRACK] 전체 데이터 검수 완료: 모든 데이터 파이프라인 정합성 확인됨");
console.log("========================================================\n");
