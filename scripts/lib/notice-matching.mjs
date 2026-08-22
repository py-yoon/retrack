/**
 * 서울시 공고/고시 텍스트를 정비사업장(projects)에 매칭하기 위한 공용 유틸리티.
 * build-seoul-events-import.mjs, build-news-seoul-events-import.mjs,
 * build-cleanup-notices-import.mjs 에서 공통으로 사용한다.
 */

import { resolveDistrict } from "./seoul-districts.mjs";

export const STOP_WORDS = new Set([
  "서울특별시", "서울시", "서울", "도시환경정비", "도시환경정비구역", "도시환경정비지구", "도시정비형",
  "주택재개발", "주택재건축", "주택재개발정비사업", "주택재건축정비사업", "재정비촉진", "재정비촉진지구", "재정비촉진구역",
  "재개발사업", "재건축사업", "정비사업", "재개발", "재건축", "도시계획", "정비구역", "지구단위계획",
  "공동주택", "아파트", "구역", "지구",
]);

export const clean = (value) =>
  String(value ?? "").replaceAll(/<[^>]*>/g, " ").replaceAll(/&nbsp;/g, " ").replaceAll(/&amp;/g, "&").replaceAll(/\s+/g, " ").trim();

export const normalize = (value) =>
  clean(value).replaceAll(/[^가-힣a-zA-Z0-9]/g, "").toLowerCase();

export const sqlValue = (value) =>
  value == null || value === "" ? "null" : `'${String(value).replaceAll("'", "''")}'`;

/**
 * "사업시행계획(변경)인가", "정비계획[변경] 결정"처럼 핵심 문구 사이에
 * 괄호 수식어와 공백이 끼어들어 원래의 인접 패턴 매칭을 피해가는 경우가 있어,
 * 분류 전에 괄호 내용과 공백을 모두 제거해 문구 인접성을 복원한다.
 */
function classificationText(title) {
  return String(title ?? "").replaceAll(/[([][^)\]]*[)\]]/g, "").replaceAll(/\s+/g, "");
}

export function determineImportance(title) {
  const text = classificationText(title);
  if (/관리처분|사업시행계획인가|사업시행인가|조합설립인가|정비구역지정|준공인가|착공|시공사선정|분양가|이주/.test(text)) {
    return 3; // 중요
  }
  if (/공람|설명회|의견청취|열람|환경영향평가|정비계획변경|공청회/.test(text)) {
    return 2; // 일반
  }
  return 1; // 낮음
}

export function determineEventType(title) {
  const text = classificationText(title);
  if (/인가/.test(text)) return "인가";
  if (/고시/.test(text)) return "고시";
  if (/변경/.test(title)) return "계획변경";
  return "공고";
}

/**
 * 서울시 Open API upisRebuild(정비사업장 목록)를 페이지네이션하며 전부 가져온다.
 */
export async function fetchUpisRebuildProjects(key) {
  const rows = [];
  for (let start = 1; ; start += 1000) {
    const response = await fetch(`http://openapi.seoul.go.kr:8088/${key}/json/upisRebuild/${start}/${start + 999}/`);
    if (!response.ok) throw new Error(`upisRebuild 요청 실패: ${response.status}`);
    const body = await response.json();
    const result = body?.upisRebuild;
    if (result?.RESULT?.CODE !== "INFO-000") throw new Error(result?.RESULT?.MESSAGE ?? "upisRebuild 응답 오류");
    rows.push(...(result.row ?? []));
    if (rows.length >= Number(result.list_total_count) || (result.row ?? []).length === 0) break;
  }
  return rows;
}

/**
 * upisRebuild 원본 행들을 PRJC_CD 기준으로 묶어, 자치구/검색 키워드가 포함된
 * 매칭용 인덱스({ code, district, searchKeywords }[])로 변환한다.
 */
export function buildProjectIndex(projectRows) {
  const projects = new Map();
  for (const row of projectRows) {
    if (!row.PRJC_CD) continue;
    if (!projects.has(row.PRJC_CD)) projects.set(row.PRJC_CD, []);
    projects.get(row.PRJC_CD).push(row);
  }

  return [...projects.entries()].map(([code, pRows]) => {
    const combinedText = pRows.map((r) => `${r.PSTN_NM ?? ""} ${r.RGN_NM ?? ""}`).join(" ");
    const allCodes = pRows.flatMap((r) => [r.PRJC_CD, r.RPT_MNG_CD, r.DCSN_ANCMNT_MNG_CD]).filter(Boolean);
    const district = resolveDistrict({ text: combinedText, codes: allCodes });
    const names = pRows.map((r) => r.RGN_NM).filter(Boolean);
    const addrs = pRows.map((r) => r.PSTN_NM).filter(Boolean);

    const searchKeywords = [...new Set([...names, ...addrs])]
      .map(normalize)
      .filter((k) => k.length >= 3 && !STOP_WORDS.has(k) && !k.startsWith("서울특별시"));

    return { code, district, searchKeywords };
  });
}

/**
 * 공고/고시 텍스트(정규화 전)를 projectIndex와 비교해 가장 먼저 일치하는 사업장을 찾는다.
 * 자치구가 서로 다르면(둘 다 판별된 경우) 오매칭 방지를 위해 건너뛴다.
 * @returns {{ project: object|null, crossDistrictMismatch: number }}
 */
export function matchProject(projectIndex, { district, text }) {
  const normalizedText = normalize(text);
  let crossDistrictMismatch = 0;

  for (const candidate of projectIndex) {
    if (candidate.searchKeywords.length === 0) continue;

    if (district && candidate.district && district !== candidate.district) {
      crossDistrictMismatch++;
      continue;
    }
    if (district && !candidate.district) continue;

    const isKeywordMatch = candidate.searchKeywords.some((keyword) => {
      if (keyword.length < 3) return false;
      return normalizedText.includes(keyword);
    });
    if (!isKeywordMatch) continue;

    return { project: candidate, crossDistrictMismatch };
  }

  return { project: null, crossDistrictMismatch };
}
