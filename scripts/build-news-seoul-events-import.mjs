/**
 * 서울시 뉴스(news.seoul.go.kr) "도시계획·부동산 소식" 카테고리에 매주 올라오는
 * "서울시 및 자치구 도시계획 관련 주요 열람공고 및 결정고시" 게시글을 수집한다.
 *
 * 서울시 Open API(TbWcmBoardB0414)가 2023년 이후로 갱신을 멈춘 것과 달리
 * 이 게시판은 실제로 매주 갱신되며, 사업시행인가/관리처분인가/준공인가 등
 * 자치구별 실제 고시·공고 번호까지 포함하고 있어 이벤트 데이터의 최신성을 보완한다.
 */
import { writeFile } from "node:fs/promises";
import { resolveDistrict, SEOUL_DISTRICTS } from "./lib/seoul-districts.mjs";
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
const output = process.env.IMPORT_OUTPUT ?? "/tmp/retrack-news-seoul-events.sql";
const pages = Number(process.env.NEWS_PAGES ?? 4);

const CATEGORY_URL = "https://news.seoul.go.kr/citybuild/archives/category/plan-news_c1/plan_news-news-n1";
const HEADLINE_PATTERN = /주요\s*열람공고\s*및\s*결정고시/;

/** 목록 페이지의 JSON-LD(@graph 안의 ItemList)에서 게시글 목록을 추출한다. */
async function fetchListPage(pageNum) {
  const url = pageNum === 1 ? CATEGORY_URL : `${CATEGORY_URL}/page/${pageNum}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`뉴스 목록 요청 실패(${pageNum}페이지): ${response.status}`);
  const html = await response.text();

  const posts = [];
  for (const scriptMatch of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let parsed;
    try {
      parsed = JSON.parse(scriptMatch[1]);
    } catch {
      continue;
    }
    const graph = Array.isArray(parsed?.["@graph"]) ? parsed["@graph"] : [];
    const itemList = graph.find((node) => node["@type"] === "ItemList");
    for (const listItem of itemList?.itemListElement ?? []) {
      const article = listItem.item;
      if (!article?.url || !article?.headline) continue;
      posts.push({ url: article.url, headline: article.headline, datePublished: article.datePublished });
    }
  }
  return posts;
}

/** 게시글 본문(#post_content)에서 "[자치구 고시/공고 제N호] 내용" 형태의 줄들을 파싱한다. */
async function fetchPostNoticeLines(postUrl) {
  const response = await fetch(postUrl);
  if (!response.ok) throw new Error(`게시글 요청 실패: ${postUrl} (${response.status})`);
  const html = await response.text();

  const contentMatch = html.match(/<div id='post_content'>([\s\S]*?)<div class="tagDiv">/);
  if (!contentMatch) return [];
  const rawContent = contentMatch[1].replaceAll(/<br\s*\/?>/g, "\n");

  const lines = [];
  for (const paragraphMatch of rawContent.matchAll(/<p>([\s\S]*?)<\/p>/g)) {
    const paragraphText = paragraphMatch[1];
    for (const line of paragraphText.split("\n")) {
      const bracketMatch = line.match(/^\s*\[([^\]]+?)\s*(고시|공고)\s*제[0-9\-]+호\]\s*(.+)$/);
      if (!bracketMatch) continue;
      const [, org, noticeKind, content] = bracketMatch;
      lines.push({ org: clean(org), noticeKind, content: clean(content) });
    }
  }
  return lines;
}

const projectRows = await fetchUpisRebuildProjects(key);
const projectIndex = buildProjectIndex(projectRows);

const matchedPosts = [];
for (let page = 1; page <= pages; page++) {
  const posts = await fetchListPage(page);
  matchedPosts.push(...posts.filter((post) => HEADLINE_PATTERN.test(post.headline)));
}
console.log(`뉴스 카테고리 ${pages}페이지에서 열람공고·결정고시 게시글 ${matchedPosts.length}건을 찾았습니다.`);

let totalLines = 0;
let crossDistrictMismatchCount = 0;
const statements = [];

for (const post of matchedPosts) {
  const postId = post.url.match(/archives\/(\d+)/)?.[1];
  if (!postId) continue;
  const publishedDate = String(post.datePublished ?? "").slice(0, 10);
  if (!publishedDate) continue;

  const lines = await fetchPostNoticeLines(post.url);
  totalLines += lines.length;

  lines.forEach((line, index) => {
    const districtFromOrg = SEOUL_DISTRICTS.includes(line.org) ? line.org : resolveDistrict({ text: line.org });
    const noticeText = `${line.org} ${line.content}`;

    const { project: bestProject, crossDistrictMismatch } = matchProject(projectIndex, {
      district: districtFromOrg,
      text: noticeText,
    });
    crossDistrictMismatchCount += crossDistrictMismatch;
    if (!bestProject) return;

    const importance = determineImportance(line.content);
    const eventType = determineEventType(`${line.noticeKind} ${line.content}`);
    const sourceEventId = `news-${postId}-${index}`;

    statements.push(
      `insert into public.events (project_id, source_event_id, title, event_type, importance, occurred_at, source_name, source_url) select id, ${sqlValue(
        sourceEventId
      )}, ${sqlValue(line.content)}, ${sqlValue(eventType)}, ${importance}, ${sqlValue(
        publishedDate
      )}, '서울시 도시계획·부동산 소식(주간 열람공고·결정고시)', ${sqlValue(
        post.url
      )} from public.projects where source_code = ${sqlValue(
        bestProject.code
      )} on conflict (source_event_id) where source_event_id is not null do update set title = excluded.title, event_type = excluded.event_type, importance = excluded.importance, occurred_at = excluded.occurred_at;`
    );
  });
}

await writeFile(
  output,
  `-- 서울시 뉴스 도시계획·부동산 소식(주간 열람공고·결정고시)\n-- 게시글: ${matchedPosts.length}, 원본 항목: ${totalLines}, 매칭 이벤트: ${statements.length}, 자치구 불일치 방지: ${crossDistrictMismatchCount}\n${statements.join(
    "\n"
  )}\n`
);
console.log(
  `게시글 ${matchedPosts.length}건, 원본 항목 ${totalLines}건 중 ${statements.length}건을 사업장에 매칭했습니다 (자치구 불일치 방지: ${crossDistrictMismatchCount}건): ${output}`
);
