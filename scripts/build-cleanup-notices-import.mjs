/**
 * 서울시 정비사업 정보몽땅(cleanup.seoul.go.kr) "고시/공고" 게시판을 수집한다.
 * (알림마당 > 고시/공고, bbsClCode=100&ctgryClCode=100)
 *
 * 조합설립추진위원회 구성/선거 관련 공고가 중심이지만 자치구·등록일이 명확히
 * 구조화되어 있고 실제로 매주 갱신되어, 정지된 Open API(TbWcmBoardB0414)를
 * 보완하는 이벤트 데이터 소스로 사용한다.
 */
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
if (!key) throw new Error("SEOUL_OPENAPI_KEY가 필요합니다.");
const output = process.env.IMPORT_OUTPUT ?? "/tmp/retrack-cleanup-notices.sql";
const pages = Number(process.env.CLEANUP_NOTICE_PAGES ?? 5);

const LIST_URL = "https://cleanup.seoul.go.kr/cleanup/bbs/lscr.do?bbsClCode=100&ctgryClCode=100";
const DETAIL_URL = (bbsSn) =>
  `https://cleanup.seoul.go.kr/cleanup/bbs/vscr.do?cpage=1&searchCode=&searchValue=&bbsClCode=100&ctgryClCode=100&bbs.bbsSn=${bbsSn}`;

async function fetchNoticeListPage(pageNum) {
  const response = await fetch(`${LIST_URL}&cpage=${pageNum}`);
  if (!response.ok) throw new Error(`정보몽땅 고시/공고 목록 요청 실패(${pageNum}페이지): ${response.status}`);
  const html = await response.text();

  const items = [];
  const itemPattern =
    /<li>\s*<a href="[^"]*bbs\.bbsSn=(\d+)">\s*<h3 class="b-tit">([\s\S]*?)<\/h3>[\s\S]*?등록일\s*:\s*([\d-]+)[\s\S]*?등록기관\s*:\s*([^<]+)</g;
  for (const match of html.matchAll(itemPattern)) {
    const [, bbsSn, title, date, org] = match;
    items.push({ bbsSn, title: clean(title), date: date.trim(), org: clean(org) });
  }
  return items;
}

const projectRows = await fetchUpisRebuildProjects(key);
const projectIndex = buildProjectIndex(projectRows);

const noticeItems = [];
for (let page = 1; page <= pages; page++) {
  const items = await fetchNoticeListPage(page);
  if (items.length === 0) break;
  noticeItems.push(...items);
}
console.log(`정보몽땅 고시/공고 게시판 ${pages}페이지에서 ${noticeItems.length}건을 가져왔습니다.`);

let crossDistrictMismatchCount = 0;
const statements = [];

for (const item of noticeItems) {
  const district = resolveDistrict({ text: item.org }) ?? resolveDistrict({ text: item.title });

  const { project: bestProject, crossDistrictMismatch } = matchProject(projectIndex, {
    district,
    text: item.title,
  });
  crossDistrictMismatchCount += crossDistrictMismatch;
  if (!bestProject) continue;

  const importance = determineImportance(item.title);
  const eventType = determineEventType(item.title);
  const sourceEventId = `cleanup-notice-${item.bbsSn}`;

  statements.push(
    `insert into public.events (project_id, source_event_id, title, event_type, importance, occurred_at, source_name, source_url) select id, ${sqlValue(
      sourceEventId
    )}, ${sqlValue(item.title)}, ${sqlValue(eventType)}, ${importance}, ${sqlValue(
      item.date
    )}, '서울시 정비사업 정보몽땅 고시/공고', ${sqlValue(
      DETAIL_URL(item.bbsSn)
    )} from public.projects where source_code = ${sqlValue(
      bestProject.code
    )} on conflict (source_event_id) where source_event_id is not null do update set title = excluded.title, event_type = excluded.event_type, importance = excluded.importance, occurred_at = excluded.occurred_at;`
  );
}

await writeFile(
  output,
  `-- 서울시 정비사업 정보몽땅 고시/공고\n-- 원본 항목: ${noticeItems.length}, 매칭 이벤트: ${statements.length}, 자치구 불일치 방지: ${crossDistrictMismatchCount}\n${statements.join(
    "\n"
  )}\n`
);
console.log(
  `원본 ${noticeItems.length}건 중 ${statements.length}건을 사업장에 매칭했습니다 (자치구 불일치 방지: ${crossDistrictMismatchCount}건): ${output}`
);
