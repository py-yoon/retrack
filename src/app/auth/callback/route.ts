import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";

  if (code) {
    // 서버 클라이언트(@supabase/ssr)를 써야 세션이 쿠키에 저장돼 브라우저로
    // 넘어간다. 이전엔 브라우저용 클라이언트를 서버에서 그대로 썼는데, 그
    // 클라이언트는 서버 컨텍스트에 쓸 수 있는 저장소가 없어 세션 교환이
    // 성공해도 아무 데도 저장되지 않았다(로그인이 안 되는 게 아니라, 되는
    // 것처럼 보이고 다음 요청에서 조용히 사라지는 형태의 버그였다).
    const supabase = await getSupabaseServerClient();
    try {
      await supabase.auth.exchangeCodeForSession(code);
    } catch (e) {
      console.error("OAuth session exchange failed:", e);
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL(next, request.url));
}
