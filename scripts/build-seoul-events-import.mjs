import { writeFile } from "node:fs/promises";

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
const projects = new Map();
for (const row of projectRows) if (row.PRJC_CD && !projects.has(row.PRJC_CD)) projects.set(row.PRJC_CD, row);
const normalize = (value) => String(value ?? "").replaceAll(/<[^>]*>/g, " ").replaceAll(/\s+/g, "").toLowerCase();
const projectSearch = [...projects.entries()].map(([code, row]) => ({ code, text: [row.RGN_NM, row.PSTN_NM].map(normalize).filter(Boolean) }));
const sqlValue = (value) => value == null || value === "" ? "null" : `'${String(value).replaceAll("'", "''")}'`;
const statements = [];
for (const notice of noticeRows) {
  const haystack = normalize(`${notice.AGND_NM ?? ""} ${notice.CN ?? ""}`);
  const project = projectSearch.find((candidate) => candidate.text.some((text) => text.length >= 5 && haystack.includes(text)));
  if (!project || !notice.PST_SN) continue;
  const match = String(notice.PBANC_PRD ?? "").match(/(20\d{2})[.년-](\d{1,2})[.월-](\d{1,2})/);
  if (!match) continue;
  const date = `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  const title = notice.AGND_NM || "도시계획 시행계획 공고";
  statements.push(`insert into public.events (project_id, source_event_id, title, event_type, importance, occurred_at, source_name, source_url) select id, ${sqlValue(notice.PST_SN)}, ${sqlValue(title)}, '공고', 2, ${sqlValue(date)}, '서울시 도시계획 시행계획 공고 정보', 'https://data.seoul.go.kr/dataList/OA-20291/S/1/datasetView.do' from public.projects where source_code = ${sqlValue(project.code)} on conflict (source_event_id) where source_event_id is not null do update set title = excluded.title, occurred_at = excluded.occurred_at;`);
}
await writeFile(output, `-- 서울시 도시계획 시행계획 공고 정보\n-- 원본 공고: ${noticeRows.length}, 매칭 이벤트: ${statements.length}\n${statements.join("\n")}\n`);
console.log(`원본 공고 ${noticeRows.length}건 중 ${statements.length}건을 사업장에 매칭했습니다: ${output}`);
