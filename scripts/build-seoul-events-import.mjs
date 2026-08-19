import { writeFile } from "node:fs/promises";
import { resolveDistrict } from "./lib/seoul-districts.mjs";

const key = process.env.SEOUL_OPENAPI_KEY;
const output = process.env.IMPORT_OUTPUT ?? "/tmp/retrack-seoul-events.sql";
if (!key) throw new Error("SEOUL_OPENAPI_KEY가 필요합니다.");

async function fetchAll(service) {
  const rows = [];
  for (let start = 1; ; start += 1000) {
    const response = await fetch(`http://openapi.seoul.go.kr:8088/${key}/json/${service}/${start}/${start + 999}/`);
    if (!response.ok) throw new Error(`${service} 요청 실패: ${response.status}`);
    const body = await response.json();
    const result = body?.[service];
    if (result?.RESULT?.CODE !== "INFO-000") throw new Error(result?.RESULT?.MESSAGE ?? `${service} 응답 오류`);
    rows.push(...(result.row ?? []));
    if (rows.length >= Number(result.list_total_count) || (result.row ?? []).length === 0) break;
  }
  return rows;
}

const [projectRows, noticeRows] = await Promise.all([fetchAll("upisRebuild"), fetchAll("TbWcmBoardB0414")]);

// Group projects by PRJC_CD
const projects = new Map();
for (const row of projectRows) {
  if (!row.PRJC_CD) continue;
  if (!projects.has(row.PRJC_CD)) projects.set(row.PRJC_CD, []);
  projects.get(row.PRJC_CD).push(row);
}

const clean = (value) => String(value ?? "").replaceAll(/<[^>]*>/g, " ").replaceAll(/\s+/g, " ").trim();
const normalize = (value) => clean(value).replaceAll(/[^가-힣a-zA-Z0-9]/g, "").toLowerCase();

const projectSearch = [...projects.entries()].map(([code, pRows]) => {
  const combinedText = pRows.map((r) => `${r.PSTN_NM ?? ""} ${r.RGN_NM ?? ""}`).join(" ");
  const allCodes = pRows.flatMap((r) => [r.PRJC_CD, r.RPT_MNG_CD, r.DCSN_ANCMNT_MNG_CD]).filter(Boolean);
  const district = resolveDistrict({ text: combinedText, codes: allCodes });
  const names = pRows.map((r) => r.RGN_NM).filter(Boolean);
  const addrs = pRows.map((r) => r.PSTN_NM).filter(Boolean);
  const searchKeywords = [...new Set([...names, ...addrs])].map(normalize).filter((k) => k.length >= 4);
  return { code, district, searchKeywords };
});

const sqlValue = (value) => value == null || value === "" ? "null" : `'${String(value).replaceAll("'", "''")}'`;

function determineImportance(title) {
  if (/관리처분|사업시행계획인가|조합설립인가|정비구역\s*지정|준공인가|착공|시공사\s*선정|분양가|이주/.test(title)) {
    return 3; // 중요
  }
  if (/공람|설명회|의견청취|열람|환경영향평가|정비계획\s*변경|공청회/.test(title)) {
    return 2; // 일반
  }
  return 1; // 낮음
}

function determineEventType(title) {
  if (/인가/.test(title)) return "인가";
  if (/고시/.test(title)) return "고시";
  if (/변경/.test(title)) return "계획변경";
  return "공고";
}

let crossDistrictMismatchCount = 0;
const statements = [];

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

    // District validation: If both notice and candidate project have district resolved, enforce matching
    if (noticeDistrict && candidate.district && noticeDistrict !== candidate.district) {
      crossDistrictMismatchCount++;
      continue;
    }

    bestProject = candidate;
    break;
  }

  if (!bestProject || !notice.PST_SN) continue;

  const match = String(notice.PBANC_PRD ?? "").match(/(20\d{2})[.년-](\d{1,2})[.월-](\d{1,2})/);
  if (!match) continue;

  const date = `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  const importance = determineImportance(noticeTitle);
  const eventType = determineEventType(noticeTitle);

  statements.push(
    `insert into public.events (project_id, source_event_id, title, event_type, importance, occurred_at, source_name, source_url) select id, ${sqlValue(
      notice.PST_SN
    )}, ${sqlValue(noticeTitle)}, ${sqlValue(eventType)}, ${importance}, ${sqlValue(
      date
    )}, '서울시 도시계획 시행계획 공고 정보', 'https://data.seoul.go.kr/dataList/OA-20291/S/1/datasetView.do' from public.projects where source_code = ${sqlValue(
      bestProject.code
    )} on conflict (source_event_id) where source_event_id is not null do update set title = excluded.title, event_type = excluded.event_type, importance = excluded.importance, occurred_at = excluded.occurred_at;`
  );
}

await writeFile(
  output,
  `-- 서울시 도시계획 시행계획 공고 정보\n-- 원본 공고: ${noticeRows.length}, 매칭 이벤트: ${statements.length}, 자치구 불일치 방지: ${crossDistrictMismatchCount}\n${statements.join(
    "\n"
  )}\n`
);
console.log(
  `원본 공고 ${noticeRows.length}건 중 ${statements.length}건을 사업장에 매칭했습니다 (자치구 불일치 방지: ${crossDistrictMismatchCount}건): ${output}`
);
