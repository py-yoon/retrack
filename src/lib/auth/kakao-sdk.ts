/**
 * Direct Kakao JavaScript SDK Client (Supabase Provider 설정 없이도 동작하는 순정 카카오 로그인)
 */

declare global {
  interface Window {
    Kakao?: any;
  }
}

const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

let isKakaoLoading = false;

// 카카오 디벨로퍼스(https://developers.kakao.com)에서 발급받은 JavaScript 키를
// NEXT_PUBLIC_KAKAO_JS_KEY 로 설정해야 한다. 그 앱의 "플랫폼 > Web"에 실제 접속
// 도메인(예: http://localhost:3000, 배포 도메인)이 등록돼 있지 않으면 팝업이
// 열리자마자 카카오 쪽에서 거부한다. 키가 없으면 시도조차 하지 않고 명확히
// 실패시켜, 원인을 알 수 없는 팝업 에러 대신 바로 설정 문제라는 걸 알 수 있게 한다.
export function loadKakaoSdk(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (!KAKAO_JS_KEY) {
      console.warn(
        "NEXT_PUBLIC_KAKAO_JS_KEY가 설정되지 않았습니다. 카카오 디벨로퍼스에서 JavaScript 키를 발급받아 .env.local에 추가하세요."
      );
      return resolve(false);
    }

    if (window.Kakao && window.Kakao.isInitialized()) {
      return resolve(true);
    }

    if (window.Kakao && !window.Kakao.isInitialized()) {
      try {
        window.Kakao.init(KAKAO_JS_KEY);
        return resolve(true);
      } catch {
        return resolve(false);
      }
    }

    if (isKakaoLoading) {
      const check = setInterval(() => {
        if (window.Kakao?.isInitialized()) {
          clearInterval(check);
          resolve(true);
        }
      }, 100);
      return;
    }

    isKakaoLoading = true;
    const script = document.createElement("script");
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
    // 기존 해시가 실제 CDN 파일과 달라 SRI 검증에 걸려 스크립트 로드 자체가
    // 조용히 실패하고 있었다(콘솔엔 "Failed to load Kakao SDK script"만 남음).
    // curl로 해당 CDN 파일을 직접 받아 sha384 재계산해 바로잡았다.
    script.integrity = "sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4";
    script.crossOrigin = "anonymous";
    script.async = true;

    script.onload = () => {
      try {
        if (window.Kakao && !window.Kakao.isInitialized()) {
          window.Kakao.init(KAKAO_JS_KEY);
        }
        resolve(true);
      } catch (err) {
        console.warn("Kakao SDK init error:", err);
        resolve(false);
      }
    };

    script.onerror = () => {
      console.warn("Failed to load Kakao SDK script");
      resolve(false);
    };

    document.head.appendChild(script);
  });
}

export type KakaoUserProfile = {
  id: string;
  nickname: string;
  profileImage?: string;
  email?: string;
};

// 카카오 JS SDK v2는 팝업으로 바로 프로필을 받아오던 v1의 Auth.login()을 더 이상
// 지원하지 않는다(카카오 공식 문서 확인, 2026-08-21). 지금은 Auth.authorize()로
// 카카오 로그인 화면으로 리다이렉트한 뒤, 카카오가 redirectUri로 돌려주는 인가
// 코드를 서버(src/app/auth/kakao/callback/route.ts)에서 토큰으로 교환해야 한다.
// 이 함수는 리다이렉트를 시작만 하고 반환하지 않는다(페이지가 이동한다).
export async function redirectToKakaoLogin(redirectUri: string, state?: string): Promise<void> {
  const isLoaded = await loadKakaoSdk();
  if (!isLoaded || !window.Kakao) {
    throw new Error(
      KAKAO_JS_KEY
        ? "카카오 SDK를 불러오지 못했습니다. 네트워크 상태를 확인하거나 잠시 후 다시 시도하세요."
        : "카카오 로그인이 아직 설정되지 않았습니다. (관리자: NEXT_PUBLIC_KAKAO_JS_KEY 설정 필요)"
    );
  }
  window.Kakao.Auth.authorize({ redirectUri, state });
}
