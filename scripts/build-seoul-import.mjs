import { writeFile } from "node:fs/promises";

const key = process.env.SEOUL_OPENAPI_KEY;
const output = process.env.IMPORT_OUTPUT ?? "/tmp/retrack-seoul-projects.sql";

if (!key) throw new Error("SEOUL_OPENAPI_KEY가 필요합니다.");

const pageSize = 1000;
const rows = [];
for (let start = 1; ; start += pageSize) {
  const end = start + pageSize - 1;
  const url = `http://openapi.seoul.go.kr:8088/${key}/json/upisRebuild/${start}/${end}/`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`서울시 API 요청 실패: ${response.status}`);
  const body = await response.json();
  const result = body?.upisRebuild;
  if (result?.RESULT?.CODE !== "INFO-000") throw new Error(result?.RESULT?.MESSAGE ?? "서울시 API 응답 오류");
  rows.push(...(result.row ?? []));
  if (rows.length >= Number(result.list_total_count) || (result.row ?? []).length === 0) break;
}

const unique = new Map();
for (const row of rows) {
  if (!row.PRJC_CD || unique.has(row.PRJC_CD)) continue;
  unique.set(row.PRJC_CD, row);
}

const sqlValue = (value) => value == null || value === "" ? "null" : `'${String(value).replaceAll("'", "''")}'`;
const statements = [...unique.values()].map((row) => {
  const name = row.RGN_NM || row.PSTN_NM || "서울 정비사업";
  const address = row.PSTN_NM || name;
  return `insert into public.projects (source_code, name, address, project_type, current_status) values (${sqlValue(row.PRJC_CD)}, ${sqlValue(name)}, ${sqlValue(address)}, ${sqlValue(row.SCLSF)}, ${sqlValue(row.MCLSF)}) on conflict (source_code) where source_code is not null do update set name = excluded.name, address = excluded.address, project_type = excluded.project_type, current_status = excluded.current_status, updated_at = now();`;
});

await writeFile(output, `-- 서울시 도시계획 정비사업 현황\n-- 원본 행: ${rows.length}, 사업장: ${unique.size}\n${statements.join("\n")}\n`);
console.log(`원본 ${rows.length}건에서 사업장 ${unique.size}건을 생성했습니다: ${output}`);
