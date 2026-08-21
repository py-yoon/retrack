/**
 * Official Renewal Projects Catalog & Dataset (서울시 주요 핵심 정비사업 카탈로그)
 */

export type ProjectCatalogItem = {
  id: string;
  name: string;
  address: string;
  district: string;
  project_type: string;
  current_status: string;
  updated_at: string;
  latitude: number;
  longitude: number;
  total_households?: number;
  floors?: string;
  construction_company?: string;
  keywords: string[];
  events: Array<{
    id: string;
    title: string;
    event_type: string;
    importance: number;
    occurred_at: string;
    source_name: string;
    source_url?: string;
  }>;
};

export const PROJECTS_CATALOG: Record<string, ProjectCatalogItem> = {
  // 1. 마포로1-24
  "cb005e1e-cad8-4c15-bd80-e6ce42a7a400": {
    id: "cb005e1e-cad8-4c15-bd80-e6ce42a7a400",
    name: "마포로1-24도시환경정비지구",
    address: "서울특별시 마포구 도화동 16-1 일대",
    district: "마포구",
    project_type: "도시정비형 재개발",
    current_status: "사업시행인가",
    updated_at: "2024-03-15",
    latitude: 37.5395,
    longitude: 126.9471,
    total_households: 580,
    floors: "지하 4층 ~ 지상 32층",
    construction_company: "시공사 선정 준비 중",
    keywords: ["마포로", "마포로1", "마포로1-24", "도화동", "도화동 16", "ㅁㅍㄹ"],
    events: [
      { id: "e-1", title: "마포로1-24도시환경정비지구 사업시행변경인가 공람공고", event_type: "인가", importance: 3, occurred_at: "2024-03-15", source_name: "서울시 고시정보" },
      { id: "e-2", title: "정비계획 및 정비구역 변경결정 고시", event_type: "계획변경", importance: 2, occurred_at: "2023-08-20", source_name: "서울시 정보몽땅" },
      { id: "e-3", title: "정비구역 최초 지정 고시", event_type: "구역지정", importance: 3, occurred_at: "2012-05-18", source_name: "서울시 고시" },
    ],
  },

  // 2. 한남3구역
  "hannam-3": {
    id: "hannam-3",
    name: "한남3재정비촉진구역",
    address: "서울특별시 용산구 한남동 686 일대",
    district: "용산구",
    project_type: "주택재개발",
    current_status: "관리처분인가",
    updated_at: "2024-01-20",
    latitude: 37.5312,
    longitude: 126.9995,
    total_households: 5816,
    floors: "지하 6층 ~ 지상 22층 (197개동)",
    construction_company: "현대건설 (디에이치 한남)",
    keywords: ["한남", "한남3", "한남3구역", "한남동 686", "보광동", "용산", "ㅎㄴ", "ㅎㄴ3"],
    events: [
      { id: "hn3-1", title: "한남3재정비촉진구역 관리처분계획인가 고시 및 이주 개시", event_type: "관리처분인가", importance: 3, occurred_at: "2023-06-23", source_name: "용산구청 고시" },
      { id: "hn3-2", title: "사업시행인가 고시", event_type: "사업시행인가", importance: 3, occurred_at: "2019-03-29", source_name: "용산구청 고시" },
      { id: "hn3-3", title: "조합설립인가", event_type: "조합설립", importance: 2, occurred_at: "2012-09-04", source_name: "서울시 정보몽땅" },
      { id: "hn3-4", title: "한남재정비촉진지구 최초 구역지정", event_type: "구역지정", importance: 3, occurred_at: "2009-10-01", source_name: "서울시 고시" },
    ],
  },

  // 3. 한남2구역
  "hannam-2": {
    id: "hannam-2",
    name: "한남2재정비촉진구역",
    address: "서울특별시 용산구 보광동 272-3 일대",
    district: "용산구",
    project_type: "주택재개발",
    current_status: "사업시행인가",
    updated_at: "2024-02-10",
    latitude: 37.5342,
    longitude: 126.9961,
    total_households: 1537,
    floors: "지하 6층 ~ 지상 14층 (31개동)",
    construction_company: "대우건설 (르엘 한남)",
    keywords: ["한남", "한남2", "한남2구역", "보광동 272", "용산", "ㅎㄴ2"],
    events: [
      { id: "hn2-1", title: "한남2구역 사업시행변경계획 총회 및 인허가 접수", event_type: "계획변경", importance: 2, occurred_at: "2023-11-15", source_name: "용산구청" },
      { id: "hn2-2", title: "사업시행계획인가 고시", event_type: "사업시행인가", importance: 3, occurred_at: "2021-11-26", source_name: "용산구청 고시" },
    ],
  },

  // 4. 한남4구역
  "hannam-4": {
    id: "hannam-4",
    name: "한남4재정비촉진구역",
    address: "서울특별시 용산구 보광동 360 일대",
    district: "용산구",
    project_type: "주택재개발",
    current_status: "사업시행인가",
    updated_at: "2024-04-05",
    latitude: 37.5288,
    longitude: 127.0042,
    total_households: 2331,
    floors: "최고 23층 (51개동)",
    construction_company: "시공사 선정 진행 중",
    keywords: ["한남", "한남4", "한남4구역", "보광동", "용산", "ㅎㄴ4"],
    events: [
      { id: "hn4-1", title: "한남4구역 재정비촉진계획 변경 및 건축심의 통과", event_type: "건축심의", importance: 3, occurred_at: "2024-02-27", source_name: "서울시 건축위원회" },
      { id: "hn4-2", title: "조합설립인가", event_type: "조합설립", importance: 2, occurred_at: "2015-01-06", source_name: "용산구청" },
    ],
  },

  // 5. 한남5구역
  "hannam-5": {
    id: "hannam-5",
    name: "한남5재정비촉진구역",
    address: "서울특별시 용산구 동빙고동 60 일대",
    district: "용산구",
    project_type: "주택재개발",
    current_status: "사업시행인가",
    updated_at: "2024-03-22",
    latitude: 37.5255,
    longitude: 126.9982,
    total_households: 2560,
    floors: "최고 23층",
    construction_company: "시공사 입찰 준비 중 (DL이앤씨 유력)",
    keywords: ["한남", "한남5", "한남5구역", "동빙고동", "용산", "ㅎㄴ5"],
    events: [
      { id: "hn5-1", title: "한남5구역 건축심의 통과 및 사업시행인가 준비", event_type: "건축심의", importance: 3, occurred_at: "2024-04-09", source_name: "서울시 건축위원회" },
      { id: "hn5-2", title: "조합설립인가", event_type: "조합설립", importance: 2, occurred_at: "2012-08-20", source_name: "용산구청" },
    ],
  },

  // 6. 압구정3구역
  "apgujeong-3": {
    id: "apgujeong-3",
    name: "압구정3구역 (현대1~7차·10·13·14차)",
    address: "서울특별시 강남구 압구정동 369 일대",
    district: "강남구",
    project_type: "재건축",
    current_status: "조합설립인가",
    updated_at: "2024-03-10",
    latitude: 37.5315,
    longitude: 127.0292,
    total_households: 5800,
    floors: "최고 50~70층 계획",
    construction_company: "희림·희원 컨소시엄 설계",
    keywords: ["압구정", "압구정3", "압구정3구역", "현대아파트", "압구정동 369", "강남", "ㅇㄱㅈ", "ㅇㄱㅈ3"],
    events: [
      { id: "ap3-1", title: "압구정3구역 신속통합기획 정비계획 변경 결정(안) 열람공고", event_type: "계획변경", importance: 3, occurred_at: "2023-11-20", source_name: "강남구청" },
      { id: "ap3-2", title: "조합설립인가 고시", event_type: "조합설립", importance: 3, occurred_at: "2021-04-19", source_name: "강남구청 고시" },
      { id: "ap3-3", title: "압구정아파트지구 개발기본계획 최초 결정", event_type: "구역지정", importance: 2, occurred_at: "1976-08-21", source_name: "서울시 고시" },
    ],
  },

  // 7. 압구정2구역
  "apgujeong-2": {
    id: "apgujeong-2",
    name: "압구정2구역 (신현대9·11·12차)",
    address: "서울특별시 강남구 압구정동 426 일대",
    district: "강남구",
    project_type: "재건축",
    current_status: "조합설립인가",
    updated_at: "2024-02-15",
    latitude: 37.5275,
    longitude: 127.0225,
    total_households: 2700,
    floors: "최고 70층 계획 (디에이건축 설계)",
    construction_company: "시공사 선정 준비 중",
    keywords: ["압구정", "압구정2", "압구정2구역", "신현대", "압구정동 426", "강남", "ㅇㄱㅈ2"],
    events: [
      { id: "ap2-1", title: "압구정2구역 정비계획 변경 입안 제안", event_type: "계획변경", importance: 2, occurred_at: "2023-10-18", source_name: "강남구청" },
      { id: "ap2-2", title: "조합설립인가", event_type: "조합설립", importance: 3, occurred_at: "2021-04-12", source_name: "강남구청" },
    ],
  },

  // 8. 대치 은마아파트
  "daechi-eunma": {
    id: "daechi-eunma",
    name: "대치 은마아파트",
    address: "서울특별시 강남구 대치동 316 일대",
    district: "강남구",
    project_type: "재건축",
    current_status: "조합설립인가",
    updated_at: "2024-03-01",
    latitude: 37.4975,
    longitude: 127.0655,
    total_households: 5778,
    floors: "최고 35~49층 (33개동)",
    construction_company: "조합설립 후 시공사 선정 준비",
    keywords: ["은마", "은마아파트", "대치은마", "대치동 316", "강남", "ㅇㅁ", "ㄷㅊㅇㅁ"],
    events: [
      { id: "em-1", title: "은마아파트 조합설립인가 승인", event_type: "조합설립", importance: 3, occurred_at: "2023-09-26", source_name: "강남구청" },
      { id: "em-2", title: "은마아파트 정비구역 지정 및 정비계획 결정 고시", event_type: "구역지정", importance: 3, occurred_at: "2023-02-16", source_name: "서울시 고시" },
      { id: "em-3", title: "추진위원회 최초 승인", event_type: "추진위", importance: 2, occurred_at: "2003-12-31", source_name: "강남구청" },
    ],
  },

  // 9. 성수전략정비구역 1지구
  "seongsu-1": {
    id: "seongsu-1",
    name: "성수전략정비구역 1지구",
    address: "서울특별시 성동구 성수동1가 72-10 일대",
    district: "성동구",
    project_type: "주택재개발",
    current_status: "조합설립인가",
    updated_at: "2024-04-12",
    latitude: 37.5372,
    longitude: 127.0435,
    total_households: 3014,
    floors: "최고 50층~70층 초고층 계획",
    construction_company: "건축심의 및 시공사 선정 준비 중",
    keywords: ["성수", "성수1", "성수전략", "성수전략1", "성수동1가 72", "성동", "ㅅㅅ", "ㅅㅅ1"],
    events: [
      { id: "ss1-1", title: "성수전략정비구역 1지구 정비계획 변경 결정(안) 공람", event_type: "계획변경", importance: 3, occurred_at: "2024-03-08", source_name: "성동구청" },
      { id: "ss1-2", title: "조합설립인가", event_type: "조합설립", importance: 3, occurred_at: "2017-07-28", source_name: "성동구청" },
    ],
  },

  // 10. 노량진1재정비촉진구역
  "noryangjin-1": {
    id: "noryangjin-1",
    name: "노량진1재정비촉진구역",
    address: "서울특별시 동작구 노량진동 278-2 일대",
    district: "동작구",
    project_type: "주택재개발",
    current_status: "사업시행인가",
    updated_at: "2024-04-30",
    latitude: 37.5115,
    longitude: 126.9425,
    total_households: 2992,
    floors: "지하 4층 ~ 지상 33층 (28개동)",
    construction_company: "포스코이앤씨 (오티에르 노량진)",
    keywords: ["노량진", "노량진1", "노량진1구역", "노량진동 278", "동작", "ㄴㄹㅈ", "ㄴㄹㅈ1"],
    events: [
      { id: "nr1-1", title: "노량진1구역 시공사 포스코이앤씨 최종 선정 총회 가결", event_type: "시공사선정", importance: 3, occurred_at: "2024-04-27", source_name: "조합 공고" },
      { id: "nr1-2", title: "사업시행계획인가 고시", event_type: "사업시행인가", importance: 3, occurred_at: "2023-03-09", source_name: "동작구청 고시" },
    ],
  },

  // 11. 흑석9재정비촉진구역
  "heukseok-9": {
    id: "heukseok-9",
    name: "흑석9재정비촉진구역",
    address: "서울특별시 동작구 흑석동 90 일대",
    district: "동작구",
    project_type: "주택재개발",
    current_status: "착공",
    updated_at: "2024-03-18",
    latitude: 37.5052,
    longitude: 126.9615,
    total_households: 1536,
    floors: "지하 7층 ~ 지상 25층 (21개동)",
    construction_company: "현대건설 (디에이치 켄트로나인)",
    keywords: ["흑석", "흑석9", "흑석9구역", "흑석동 90", "동작", "ㅎㅅ", "ㅎㅅ9"],
    events: [
      { id: "hs9-1", title: "흑석9구역 착공 신고 및 공사 개시", event_type: "착공", importance: 3, occurred_at: "2024-01-15", source_name: "동작구청" },
      { id: "hs9-2", title: "관리처분계획인가 고시", event_type: "관리처분인가", importance: 3, occurred_at: "2019-10-24", source_name: "동작구청 고시" },
    ],
  },

  // 12. 반포주공1단지 (1·2·4주구)
  "banpo-124": {
    id: "banpo-124",
    name: "반포주공1단지 (1·2·4주구)",
    address: "서울특별시 서초구 반포동 810 일대",
    district: "서초구",
    project_type: "재건축",
    current_status: "착공",
    updated_at: "2024-04-10",
    latitude: 37.5028,
    longitude: 126.9932,
    total_households: 5002,
    floors: "지하 5층 ~ 지상 35층 (50개동)",
    construction_company: "현대건설 (디에이치 클래스트)",
    keywords: ["반포", "반포124", "반포주공", "디에이치클래스트", "반포동 810", "서초", "ㅂㅍ"],
    events: [
      { id: "bp-1", title: "반포1·2·4주구 착공식 개최 및 본공사 착수", event_type: "착공", importance: 3, occurred_at: "2024-03-29", source_name: "서초구청" },
      { id: "bp-2", title: "관리처분계획인가 고시", event_type: "관리처분인가", importance: 3, occurred_at: "2018-12-03", source_name: "서초구청" },
    ],
  },

  // 13. 잠실주공5단지
  "jamsil-5": {
    id: "jamsil-5",
    name: "잠실주공5단지",
    address: "서울특별시 송파구 잠실동 27 일대",
    district: "송파구",
    project_type: "재건축",
    current_status: "사업시행인가",
    updated_at: "2024-04-15",
    latitude: 37.5148,
    longitude: 127.0988,
    total_households: 6491,
    floors: "최고 70층 (28개동)",
    construction_company: "시공사 선정 준비 중",
    keywords: ["잠실", "잠실5", "잠실주공5단지", "잠실동 27", "송파", "ㅈㅅ", "ㅈㅅ5"],
    events: [
      { id: "js-1", title: "잠실5단지 정비계획 변경 및 지구단위계획 결정 고시 (최고 70층)", event_type: "계획변경", importance: 3, occurred_at: "2024-04-04", source_name: "서울시 고시" },
      { id: "js-2", title: "조합설립인가", event_type: "조합설립", importance: 3, occurred_at: "2013-12-19", source_name: "송파구청" },
    ],
  },

  // 14. 갈현1구역
  "galhyeon-1": {
    id: "galhyeon-1",
    name: "갈현1구역",
    address: "서울특별시 은평구 갈현동 300 일대",
    district: "은평구",
    project_type: "주택재개발",
    current_status: "관리처분인가",
    updated_at: "2024-02-28",
    latitude: 37.6212,
    longitude: 126.9145,
    total_households: 4116,
    floors: "지하 6층 ~ 지상 22층 (32개동)",
    construction_company: "롯데건설 (북한산 시그니처 롯데캐슬)",
    keywords: ["갈현", "갈현1", "갈현1구역", "갈현동 300", "은평", "ㄱㅎ", "ㄱㅎ1"],
    events: [
      { id: "gh-1", title: "갈현1구역 이주 및 철거 공사 진행", event_type: "철거", importance: 2, occurred_at: "2023-10-12", source_name: "은평구청" },
      { id: "gh-2", title: "관리처분계획인가 고시", event_type: "관리처분인가", importance: 3, occurred_at: "2022-05-27", source_name: "은평구청 고시" },
    ],
  },
};

/**
 * Find project by ID or Exact/Partial Keyword
 */
export function findProjectFromCatalog(idOrKeyword: string): ProjectCatalogItem | null {
  if (!idOrKeyword) return null;
  const target = idOrKeyword.trim().toLowerCase();

  // 1. Exact ID
  if (PROJECTS_CATALOG[target]) {
    return PROJECTS_CATALOG[target];
  }

  // 2. Exact or Partial Name / Keyword Match
  const cleanTarget = target.replaceAll(/\s+/g, "");
  for (const item of Object.values(PROJECTS_CATALOG)) {
    const cleanName = item.name.replaceAll(/\s+/g, "").toLowerCase();
    if (cleanName.includes(cleanTarget) || cleanTarget.includes(cleanName)) {
      return item;
    }
    if (item.keywords.some((k) => cleanTarget.includes(k.replaceAll(/\s+/g, "").toLowerCase()) || k.replaceAll(/\s+/g, "").toLowerCase().includes(cleanTarget))) {
      return item;
    }
  }

  return null;
}

/**
 * Real-time instant search from catalog (Chosung, keywords, lot number)
 */
export function searchProjectsFromCatalog(term: string): ProjectCatalogItem[] {
  if (!term.trim()) return [];
  const cleanTerm = term.trim().replaceAll(/\s+/g, "").toLowerCase();

  const results: ProjectCatalogItem[] = [];
  for (const item of Object.values(PROJECTS_CATALOG)) {
    const cleanName = item.name.replaceAll(/\s+/g, "").toLowerCase();
    const cleanAddr = item.address.replaceAll(/\s+/g, "").toLowerCase();
    const cleanDist = item.district.replaceAll(/\s+/g, "").toLowerCase();

    if (
      cleanName.includes(cleanTerm) ||
      cleanAddr.includes(cleanTerm) ||
      cleanDist.includes(cleanTerm) ||
      item.keywords.some((k) => k.replaceAll(/\s+/g, "").toLowerCase().includes(cleanTerm) || cleanTerm.includes(k.replaceAll(/\s+/g, "").toLowerCase()))
    ) {
      results.push(item);
    }
  }

  // Sort by exact match
  results.sort((a, b) => {
    const aMatch = a.name.toLowerCase().startsWith(cleanTerm) || a.keywords.includes(cleanTerm);
    const bMatch = b.name.toLowerCase().startsWith(cleanTerm) || b.keywords.includes(cleanTerm);
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });

  return results;
}
