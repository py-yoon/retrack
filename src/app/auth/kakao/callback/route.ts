import { NextRequest, NextResponse } from "next/server";

// 카카오 로그인 Auth.authorize()가 사용자를 카카오 동의 화면으로 보낸 뒤
// 돌려보내는 곳. 인가 코드를 REST API 키로 토큰 교환하고, 그 토큰으로 프로필을
// 조회한 다음, 원래 페이지로 결과를 쿼리 파라미터에 실어 돌려보낸다.
// (REST API 키/토큰 교환은 반드시 서버에서만 해야 한다 — 클라이언트에 노출 금지)
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const oauthError = requestUrl.searchParams.get("error");
  // state는 카카오가 그대로 되돌려주는 값이라 위조될 수 있다. "/"로 시작하는
  // 내부 경로만 신뢰하고, 그 외(예: 외부 URL)는 오픈 리다이렉트로 악용될 수
  // 있으니 무시한다.
  const rawState = requestUrl.searchParams.get("state") ?? "/";
  const next = rawState.startsWith("/") ? rawState : "/";

  const redirectWithError = (reason: string) => {
    const target = new URL(next, requestUrl.origin);
    target.searchParams.set("kakao_error", reason);
    return NextResponse.redirect(target);
  };

  if (oauthError || !code) {
    return redirectWithError(oauthError || "no_code");
  }

  const restApiKey = process.env.KAKAO_REST_API_KEY;
  if (!restApiKey) {
    return redirectWithError("not_configured");
  }

  const redirectUri = `${requestUrl.origin}/auth/kakao/callback`;

  try {
    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: restApiKey,
        redirect_uri: redirectUri,
        code,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("카카오 토큰 교환 실패:", tokenData);
      return redirectWithError("token_exchange_failed");
    }

    const profileRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    if (!profileRes.ok || !profile.id) {
      console.error("카카오 프로필 조회 실패:", profile);
      return redirectWithError("profile_fetch_failed");
    }

    const nickname: string = profile.kakao_account?.profile?.nickname || "카카오 사용자";
    const profileImage: string | undefined = profile.kakao_account?.profile?.profile_image_url;
    const email: string = profile.kakao_account?.email || `kakao_${profile.id}@retrack.kr`;

    const payload = Buffer.from(
      JSON.stringify({ id: String(profile.id), nickname, profileImage, email })
    ).toString("base64");

    const target = new URL(next, requestUrl.origin);
    target.searchParams.set("kakao_profile", payload);
    return NextResponse.redirect(target);
  } catch (e) {
    console.error("카카오 로그인 콜백 처리 실패:", e);
    return redirectWithError("unexpected_error");
  }
}
