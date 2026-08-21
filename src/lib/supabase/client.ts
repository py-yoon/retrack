import { createBrowserClient } from "@supabase/ssr";

// createBrowserClient(@supabase/ssr)는 세션을 localStorage가 아니라 쿠키에 저장한다.
// 그래야 서버 라우트(예: /auth/callback)에서 세션을 읽고 쓸 수 있다 — 일반
// @supabase/supabase-js의 createClient로는 서버 쪽에서 세션이 전혀 보이지 않는다.
// 여러 번 호출해도 내부적으로 싱글턴을 재사용해 GoTrueClient 중복 경고도 없앤다.
export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
  }

  return createBrowserClient(url, anonKey);
}
