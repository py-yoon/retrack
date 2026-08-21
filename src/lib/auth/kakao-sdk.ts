/**
 * Direct Kakao JavaScript SDK Client (Supabase Provider 설정 없이도 동작하는 순정 카카오 로그인)
 */

declare global {
  interface Window {
    Kakao?: any;
  }
}

// Default Public/Demo Kakao JS Key for instant testing (User can override via NEXT_PUBLIC_KAKAO_JS_KEY)
const DEFAULT_KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || "e4d257e849925e01df391dc7c5dbffea";

let isKakaoLoading = false;

export function loadKakaoSdk(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);

    if (window.Kakao && window.Kakao.isInitialized()) {
      return resolve(true);
    }

    if (window.Kakao && !window.Kakao.isInitialized()) {
      try {
        window.Kakao.init(DEFAULT_KAKAO_JS_KEY);
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
    script.integrity = "sha384-TiCUE00h649CAMonG018J2m00A/+230dxuNiHYEax0pgXGQbBq15P+4i9Y5B322b";
    script.crossOrigin = "anonymous";
    script.async = true;

    script.onload = () => {
      try {
        if (window.Kakao && !window.Kakao.isInitialized()) {
          window.Kakao.init(DEFAULT_KAKAO_JS_KEY);
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
    throw new Error("Kakao SDK not available");
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
