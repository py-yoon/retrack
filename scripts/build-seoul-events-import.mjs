import { writeFile } from "node:fs/promises";
import { resolveDistrict } from "./lib/seoul-districts.mjs";
import {
  clean,
  determineEventType,
  determineImportance,
  fetchUpisRebuildProjects,
  buildProjectIndex,
  matchProject,
  sqlValue,
} from "./lib/notice-matching.mjs";

const key = process.env.SEOUL_OPENAPI_KEY;
const output = process.env.IMPORT_OUTPUT ?? "/tmp/retrack-seoul-events.sql";
if (!key) throw new Error("SEOUL_OPENAPI_KEY가 필요합니다.");

async function fetchNotices() {
  const rows = [];
  for (let start = 1; ; start += 1000) {
    const response = await fetch(`http://openapi.seoul.go.kr:8088/${key}/json/TbWcmBoardB0414/${start}/${start + 999}/`);
    if (!response.ok) throw new Error(`TbWcmBoardB0414 요청 실패: ${response.status}`);
    const body = await response.json();
    const result = body?.TbWcmBoardB0414;
    if (result?.RESULT?.CODE !== "INFO-000") throw new Error(result?.RESULT?.MESSAGE ?? "TbWcmBoardB0414 응답 오류");
    rows.push(...(result.row ?? []));
    if (rows.length >= Number(result.list_total_count) || (result.row ?? []).length === 0) break;
  }
  return rows;
}

const [projectRows, noticeRows] = await Promise.all([fetchUpisRebuildProjects(key), fetchNotices()]);
const projectIndex = buildProjectIndex(projectRows);

let crossDistrictMismatchCount = 0;
const statements = [];

for (const notice of noticeRows) {
  const noticeTitle = clean(notice.AGND_NM ?? "도시계획 시행계획 공고");
  const noticeContent = clean(notice.CN ?? "");
  const noticeText = `${noticeTitle} ${noticeContent}`;
  const noticeDistrict = resolveDistrict({ text: noticeText });

  const { project: bestProject, crossDistrictMismatch } = matchProject(projectIndex, {
    district: noticeDistrict,
    text: noticeText,
  });
  crossDistrictMismatchCount += crossDistrictMismatch;

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
