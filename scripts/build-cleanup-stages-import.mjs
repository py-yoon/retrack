import { writeFile } from "node:fs/promises";

const output = process.env.IMPORT_OUTPUT ?? "/tmp/retrack-cleanup-stages.sql";
const pageSize = 1000;
const stageOrder = {
  "정비계획 수립": 10, "재정비촉진지구수립": 15, "안전진단": 20, "정비구역지정": 30,
  "추진위원회승인": 40, "조합설립인가": 50, "주민대표회의구성통지": 55, "사업시행인가": 60,
  "관리처분인가": 70, "철거": 80, "착공": 90, "분양": 100, "준공인가": 110,
  "이전고시": 120, "조합해산": 130, "조합청산": 140,
};
const clean = (value) => String(value ?? "").replaceAll(/<[^>]*>/g, " ").replaceAll(/&nbsp;/g, " ").replaceAll(/&amp;/g, "&").replaceAll(/\s+/g, " ").trim();
const normalize = (value) => clean(value).replaceAll(/[^가-힣a-zA-Z0-9]/g, "").toLowerCase();
const sqlValue = (value) => value == null || value === "" ? "null" : `'${String(value).replaceAll("'", "''")}'`;

const cleanupRows = [];
for (let page = 1; page <= 2; page++) {
  const response = await fetch(`https://cleanup.seoul.go.kr/cleanup/bsnssttus/lscrMainIndx.do?cpage=${page}&pageSize=${pageSize}`);
  if (!response.ok) throw new Error(`정보몽땅 요청 실패: ${response.status}`);
  const html = await response.text();
  for (const match of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...match[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((cell) => clean(cell[1]));
    if (cells.length >= 6 && stageOrder[cells[5]]) cleanupRows.push({ name: cells[3], address: cells[4], stage: cells[5] });
  }
}

const key = process.env.SEOUL_OPENAPI_KEY;
if (!key) throw new Error("SEOUL_OPENAPI_KEY가 필요합니다.");
const sourceRows = [];
for (let start = 1; ; start += 1000) {
  const source = await (await fetch(`http://openapi.seoul.go.kr:8088/${key}/json/upisRebuild/${start}/${start + 999}/`)).json();
  const result = source.upisRebuild;
  sourceRows.push(...(result.row ?? []));
  if (sourceRows.length >= Number(result.list_total_count) || (result.row ?? []).length === 0) break;
}
const projects = new Map();
for (const row of sourceRows) {
  if (row.PRJC_CD && !projects.has(row.PRJC_CD)) projects.set(row.PRJC_CD, row);
}
const statements = [];
const matched = new Set();
for (const row of cleanupRows) {
  const name = normalize(row.name);
  const address = normalize(row.address);
  const project = [...projects.entries()].find(([, item]) => {
    const projectName = normalize(item.RGN_NM);
    const projectAddress = normalize(item.PSTN_NM);
    return (projectName.length >= 5 && (projectName.includes(name) || name.includes(projectName))) || (projectAddress.length >= 5 && (projectAddress.includes(address) || address.includes(projectAddress)));
  });
  if (!project || matched.has(project[0])) continue;
  matched.add(project[0]);
  const stage = row.stage;
  statements.push(`insert into public.project_stages (project_id, stage_name, stage_order) select id, ${sqlValue(stage)}, ${stageOrder[stage]} from public.projects where source_code = ${sqlValue(project[0])} on conflict (project_id, stage_name) do update set stage_order = excluded.stage_order; update public.projects set current_status = ${sqlValue(stage)}, updated_at = now() where source_code = ${sqlValue(project[0])};`);
}
await writeFile(output, `-- 서울시 정비사업 정보몽땅 사업장 진행단계\n-- 검색 행: ${cleanupRows.length}, 매칭 사업장: ${matched.size}\n${statements.join("\n")}\n`);
console.log(`정보몽땅 ${cleanupRows.length}건 중 ${matched.size}개 사업장의 단계를 생성했습니다: ${output}`);
