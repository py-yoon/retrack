import { writeFile } from "node:fs/promises";
import { resolveDistrict } from "./lib/seoul-districts.mjs";

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

const projectsMap = new Map();
for (const row of rows) {
  if (!row.PRJC_CD) continue;
  if (!projectsMap.has(row.PRJC_CD)) {
    projectsMap.set(row.PRJC_CD, []);
  }
  projectsMap.get(row.PRJC_CD).push(row);
}

const sqlValue = (value) => value == null || value === "" ? "null" : `'${String(value).replaceAll("'", "''")}'`;

let districtCount = 0;
const statements = [...projectsMap.entries()].map(([code, pRows]) => {
  const firstWithName = pRows.find((r) => r.RGN_NM?.trim()) ?? pRows[0];
  const firstWithAddr = pRows.find((r) => r.PSTN_NM?.trim()) ?? pRows[0];
  const name = firstWithName.RGN_NM || firstWithAddr.PSTN_NM || "서울 정비사업";
  const address = firstWithAddr.PSTN_NM || name;

  const combinedText = pRows.map((r) => `${r.PSTN_NM ?? ""} ${r.RGN_NM ?? ""}`).join(" ");
  const allCodes = pRows.flatMap((r) => [r.PRJC_CD, r.RPT_MNG_CD, r.DCSN_ANCMNT_MNG_CD]).filter(Boolean);
  const district = resolveDistrict({ text: combinedText, codes: allCodes });
  if (district) districtCount++;

  const sclsf = pRows.find((r) => r.SCLSF)?.SCLSF ?? pRows[0].SCLSF;
  const mclsf = pRows.find((r) => r.MCLSF)?.MCLSF ?? pRows[0].MCLSF;

  return `insert into public.projects (source_code, name, address, district, project_type, current_status) values (${sqlValue(code)}, ${sqlValue(name)}, ${sqlValue(address)}, ${sqlValue(district)}, ${sqlValue(sclsf)}, ${sqlValue(mclsf)}) on conflict (source_code) where source_code is not null do update set name = excluded.name, address = excluded.address, district = coalesce(excluded.district, projects.district), project_type = excluded.project_type, current_status = coalesce(projects.current_status, excluded.current_status), updated_at = now();`;
});

await writeFile(output, `-- 서울시 도시계획 정비사업 현황\n-- 원본 행: ${rows.length}, 사업장: ${projectsMap.size}, 자치구 매칭: ${districtCount}\n${statements.join("\n")}\n`);
console.log(`원본 ${rows.length}건에서 사업장 ${projectsMap.size}건(자치구 매칭 ${districtCount}건)을 생성했습니다: ${output}`);

