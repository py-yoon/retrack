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

export async function loginWithKakaoDirect(): Promise<KakaoUserProfile | null> {
  const isLoaded = await loadKakaoSdk();
  if (!isLoaded || !window.Kakao) {
    throw new Error(
      KAKAO_JS_KEY
        ? "카카오 SDK를 불러오지 못했습니다. 네트워크 상태를 확인하거나 잠시 후 다시 시도하세요."
        : "카카오 로그인이 아직 설정되지 않았습니다. (관리자: NEXT_PUBLIC_KAKAO_JS_KEY 설정 필요)"
    );
  }

  return new Promise((resolve, reject) => {
    window.Kakao.Auth.login({
      success: function (authObj: any) {
        window.Kakao.API.request({
          url: "/v2/user/me",
          success: function (res: any) {
            const nickname = res.kakao_account?.profile?.nickname || "카카오 사용자";
            const profileImage = res.kakao_account?.profile?.profile_image_url;
            const email = res.kakao_account?.email || `kakao_${res.id}@retrack.kr`;

            resolve({
              id: String(res.id),
              nickname,
              profileImage,
              email,
            });
          },
          fail: function (error: any) {
            console.warn("Kakao API request failed:", error);
            reject(error);
          },
        });
      },
      fail: function (err: any) {
        console.warn("Kakao Auth.login failed:", err);
        reject(err);
      },
    });
  });
}
