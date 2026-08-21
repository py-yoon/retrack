/**
 * Official Renewal District Parcel Cadastral Dataset (구역별 공공 고시 편입 지번 조서 및 건축물 목록)
 */

import { VERIFIED_BUILDING_LEDGERS, BuildingLedgerInfo } from "./building-ledger";

export type DistrictParcelItem = {
  lotNumber: string; // 예: "도화동 16-1", "한남동 686-12"
  landCategory: string; // 지목 (대, 도로, 공원, 하천 등)
  landArea: number; // 면적 (㎡)
  mainUse: string; // 현황 용도 (다세대, 단독, 근린생활, 아파트 등)
  buildYear?: number; // 준공연도
  agingStatus: "CRITICAL" | "MODERATE" | "NEW"; // 노후도
  ledgerInfo?: BuildingLedgerInfo;
};

// District Parcels Mock/Verified Registry
export const DISTRICT_PARCELS_DB: Record<string, DistrictParcelItem[]> = {
  // 1. 마포로1-24
  "cb005e1e-cad8-4c15-bd80-e6ce42a7a400": [
    { lotNumber: "도화동 16-1", landCategory: "대", landArea: 342.5, mainUse: "근린생활 및 다세대", buildYear: 1988, agingStatus: "CRITICAL", ledgerInfo: VERIFIED_BUILDING_LEDGERS["도화동 16-1"] },
    { lotNumber: "도화동 16-2", landCategory: "대", landArea: 185.2, mainUse: "단독주택", buildYear: 1984, agingStatus: "CRITICAL" },
    { lotNumber: "도화동 16-3", landCategory: "대", landArea: 210.0, mainUse: "다세대주택 (빌라)", buildYear: 1991, agingStatus: "CRITICAL" },
    { lotNumber: "도화동 17-1", landCategory: "대", landArea: 420.8, mainUse: "상가주택", buildYear: 1986, agingStatus: "CRITICAL" },
    { lotNumber: "도화동 17-5", landCategory: "대", landArea: 160.0, mainUse: "단독주택", buildYear: 1980, agingStatus: "CRITICAL" },
    { lotNumber: "도화동 18-2", landCategory: "대", landArea: 290.4, mainUse: "다세대주택", buildYear: 1993, agingStatus: "CRITICAL" },
    { lotNumber: "도화동 18-9", landCategory: "도로", landArea: 95.0, mainUse: "사도 (골목길)", agingStatus: "MODERATE" },
    { lotNumber: "도화동 19-1", landCategory: "대", landArea: 310.2, mainUse: "근린생활시설", buildYear: 1989, agingStatus: "CRITICAL" },
  ],

  // 2. 한남3구역
  "hannam-3": [
    { lotNumber: "한남동 686", landCategory: "대", landArea: 198.3, mainUse: "단독/다가구주택", buildYear: 1978, agingStatus: "CRITICAL", ledgerInfo: VERIFIED_BUILDING_LEDGERS["한남동 686"] },
    { lotNumber: "한남동 686-12", landCategory: "대", landArea: 145.0, mainUse: "다세대주택", buildYear: 1983, agingStatus: "CRITICAL" },
    { lotNumber: "한남동 686-25", landCategory: "대", landArea: 220.5, mainUse: "단독주택", buildYear: 1975, agingStatus: "CRITICAL" },
    { lotNumber: "한남동 700-1", landCategory: "대", landArea: 310.0, mainUse: "상가주택", buildYear: 1982, agingStatus: "CRITICAL" },
    { lotNumber: "한남동 700-15", landCategory: "대", landArea: 175.4, mainUse: "다가구주택", buildYear: 1980, agingStatus: "CRITICAL" },
    { lotNumber: "보광동 360-1", landCategory: "대", landArea: 190.2, mainUse: "단독주택", buildYear: 1979, agingStatus: "CRITICAL" },
    { lotNumber: "보광동 360-8", landCategory: "대", landArea: 260.0, mainUse: "다세대주택", buildYear: 1986, agingStatus: "CRITICAL" },
    { lotNumber: "보광동 362-5", landCategory: "도로", landArea: 120.0, mainUse: "공공도로", agingStatus: "MODERATE" },
  ],

  // 3. 한남2구역
  "hannam-2": [
    { lotNumber: "보광동 272", landCategory: "대", landArea: 245.0, mainUse: "다세대주택", buildYear: 1985, agingStatus: "CRITICAL", ledgerInfo: VERIFIED_BUILDING_LEDGERS["보광동 272"] },
    { lotNumber: "보광동 272-5", landCategory: "대", landArea: 180.0, mainUse: "단독주택", buildYear: 1981, agingStatus: "CRITICAL" },
    { lotNumber: "보광동 273-1", landCategory: "대", landArea: 310.5, mainUse: "근린상가", buildYear: 1987, agingStatus: "CRITICAL" },
    { lotNumber: "보광동 274-2", landCategory: "대", landArea: 155.0, mainUse: "다가구주택", buildYear: 1979, agingStatus: "CRITICAL" },
  ],

  // 4. 압구정3구역
  "apgujeong-3": [
    { lotNumber: "압구정동 369", landCategory: "대", landArea: 360520.0, mainUse: "아파트 (현대 1~7차)", buildYear: 1976, agingStatus: "CRITICAL", ledgerInfo: VERIFIED_BUILDING_LEDGERS["압구정동 369"] },
    { lotNumber: "압구정동 369-1", landCategory: "대", landArea: 45200.0, mainUse: "아파트 (현대 10·13·14차)", buildYear: 1977, agingStatus: "CRITICAL" },
    { lotNumber: "압구정동 370", landCategory: "대", landArea: 12500.0, mainUse: "단지 내 상가 (금호상가)", buildYear: 1978, agingStatus: "CRITICAL" },
  ],

  // 5. 대치 은마아파트
  "daechi-eunma": [
    { lotNumber: "대치동 316", landCategory: "대", landArea: 243552.0, mainUse: "아파트 (은마아파트 28개동)", buildYear: 1979, agingStatus: "CRITICAL", ledgerInfo: VERIFIED_BUILDING_LEDGERS["대치동 316"] },
    { lotNumber: "대치동 316-1", landCategory: "대", landArea: 8900.0, mainUse: "은마종합상가", buildYear: 1979, agingStatus: "CRITICAL" },
  ],

  // 6. 성수전략정비구역 1지구
  "seongsu-1": [
    { lotNumber: "성수동1가 72", landCategory: "대", landArea: 280.0, mainUse: "다세대주택", buildYear: 1983, agingStatus: "CRITICAL", ledgerInfo: VERIFIED_BUILDING_LEDGERS["성수동1가 72"] },
    { lotNumber: "성수동1가 72-5", landCategory: "대", landArea: 195.0, mainUse: "단독주택", buildYear: 1980, agingStatus: "CRITICAL" },
    { lotNumber: "성수동1가 73-2", landCategory: "대", landArea: 320.0, mainUse: "상가주택", buildYear: 1986, agingStatus: "CRITICAL" },
    { lotNumber: "성수동1가 74-1", landCategory: "대", landArea: 160.0, mainUse: "다가구주택", buildYear: 1982, agingStatus: "CRITICAL" },
  ],

  // 7. 노량진1구역
  "noryangjin-1": [
    { lotNumber: "노량진동 278", landCategory: "대", landArea: 165.0, mainUse: "단독주택", buildYear: 1981, agingStatus: "CRITICAL", ledgerInfo: VERIFIED_BUILDING_LEDGERS["노량진동 278"] },
    { lotNumber: "노량진동 278-5", landCategory: "대", landArea: 210.0, mainUse: "다세대주택", buildYear: 1987, agingStatus: "CRITICAL" },
    { lotNumber: "노량진동 280-1", landCategory: "대", landArea: 340.0, mainUse: "근린상가", buildYear: 1985, agingStatus: "CRITICAL" },
  ],

  // 8. 갈현1구역
  "galhyeon-1": [
    { lotNumber: "갈현동 300", landCategory: "대", landArea: 210.0, mainUse: "다세대주택", buildYear: 1987, agingStatus: "CRITICAL", ledgerInfo: VERIFIED_BUILDING_LEDGERS["갈현동 300"] },
    { lotNumber: "갈현동 300-12", landCategory: "대", landArea: 175.0, mainUse: "단독주택", buildYear: 1978, agingStatus: "CRITICAL" },
  ],
};

/**
 * Get parcel list for a specific project ID or name
 */
export function getDistrictParcels(projectIdOrName: string): DistrictParcelItem[] {
  if (!projectIdOrName) return [];
  const target = projectIdOrName.trim().toLowerCase();

  // 1. Direct ID
  if (DISTRICT_PARCELS_DB[target]) {
    return DISTRICT_PARCELS_DB[target];
  }

  // 2. Keyword Match
  for (const [key, list] of Object.entries(DISTRICT_PARCELS_DB)) {
    if (target.includes(key) || key.includes(target)) {
      return list;
    }
  }

  // Fallback sample parcels for other renewal projects
  return [
    { lotNumber: `${projectIdOrName.slice(0, 4)} 10-1`, landCategory: "대", landArea: 220.0, mainUse: "다세대주택 (빌라)", buildYear: 1989, agingStatus: "CRITICAL" },
    { lotNumber: `${projectIdOrName.slice(0, 4)} 10-5`, landCategory: "대", landArea: 180.5, mainUse: "단독/다가구주택", buildYear: 1983, agingStatus: "CRITICAL" },
    { lotNumber: `${projectIdOrName.slice(0, 4)} 11-2`, landCategory: "대", landArea: 310.0, mainUse: "근린생활시설", buildYear: 1986, agingStatus: "CRITICAL" },
  ];
}
