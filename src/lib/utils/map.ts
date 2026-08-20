/**
 * 네이버 지도 검색 URL 생성 유틸리티
 * 복잡한 지번 표기(일대, 외 N필지, 괄호 등)를 정제하여 네이버 지도에서 정확히 핀이 꽂히도록 변환합니다.
 */
export function getNaverMapUrl(
  district: string | null,
  address: string | null,
  name?: string | null
): string {
  if (!address && !name) return "https://map.naver.com/";

  let cleanAddr = String(address ?? "").trim();

  // 1. 괄호 내용 제거 (예: (41필지), (청구동), (염춘교-서소문육교간))
  cleanAddr = cleanAddr.replace(/\([^)]*\)/g, " ");

  // 2. "외 N필지 및 ...", "일대", "일원", "일부", "번지" 등 검색 방해어 제거
  cleanAddr = cleanAddr.replace(/외\s*\d+\s*필지[\s\S]*/g, " ");
  cleanAddr = cleanAddr.replace(/외\s*[\d,]+\s*필지/g, " ");
  cleanAddr = cleanAddr.replace(/일대/g, " ");
  cleanAddr = cleanAddr.replace(/일원/g, " ");
  cleanAddr = cleanAddr.replace(/일부/g, " ");
  cleanAddr = cleanAddr.replace(/번지/g, " ");

  // 3. 행정동 번호 정규화 (예: 홍은3동 -> 홍은동, 봉천11동 -> 봉천동, 고덕1동 -> 고덕동)
  cleanAddr = cleanAddr.replace(/([가-힣]{2,})[0-9]+동\b/g, "$1동");

  // 4. 불필요한 공백 정돈
  cleanAddr = cleanAddr.replace(/\s+/g, " ").trim();

  // 5. 주소에 자치구가 빠져있는 경우 자치구 추가 (예: "수표동 88-1" -> "중구 수표동 88-1")
  if (district && !cleanAddr.includes(district)) {
    cleanAddr = `${district} ${cleanAddr}`;
  }

  // 6. 만약 주소가 비어있거나 너무 짧으면 자치구 + 사업장명으로 검색
  if (cleanAddr.length < 3 && name) {
    cleanAddr = `${district ?? ""} ${name}`.trim();
  }

  // 네이버 지도 통합 검색 URL 생성
  return `https://map.naver.com/p/search/${encodeURIComponent(cleanAddr)}`;
}
