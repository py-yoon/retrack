const CHOSUNG_LIST = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"
];

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

/**
 * 주어진 한글 문자열에서 초성을 추출합니다.
 * 한글이 아닌 영문, 숫자, 기호 등은 그대로 유지합니다.
 */
export function getChosung(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= HANGUL_START && code <= HANGUL_END) {
      const chosungIndex = Math.floor((code - HANGUL_START) / 588);
      result += CHOSUNG_LIST[chosungIndex] ?? text[i];
    } else {
      result += text[i];
    }
  }
  return result;
}

/**
 * 쿼리가 순수 초성(ㄱ~ㅎ)으로만 이루어져 있는지 확인합니다.
 */
export function isPureChosung(query: string): boolean {
  return /^[ㄱ-ㅎ\s]+$/.test(query);
}

/**
 * 공백 및 특수문자를 제거한 정규화 문자열을 반환합니다.
 */
export function normalizeKeyword(text: string): string {
  return text.toLowerCase().replace(/[\s\-_.,()[\]]/g, "");
}

/**
 * 사업장명 또는 주소와 검색어를 비교하여 일치 여부를 판별합니다.
 * 1. 일반 부분 일치 (공백 무시)
 * 2. 초성 일치 (예: "ㅎㄴ" -> "한남", "ㄷㅊ" -> "대치")
 */
export function matchHangulSearch(target: string, query: string): boolean {
  const normTarget = normalizeKeyword(target);
  const normQuery = normalizeKeyword(query);

  if (!normQuery) return true;

  // 1. 일반 텍스트 포함 여부
  if (normTarget.includes(normQuery)) {
    return true;
  }

  // 2. 초성 검색 여부
  if (isPureChosung(query.trim())) {
    const targetChosung = normalizeKeyword(getChosung(target));
    const queryChosung = normalizeKeyword(query);
    return targetChosung.includes(queryChosung);
  }

  return false;
}
