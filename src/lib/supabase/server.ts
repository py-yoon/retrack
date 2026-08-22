import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Route Handler/Server Component에서 쓰는 Supabase 클라이언트. 브라우저 쪽
// getSupabaseClient()(createBrowserClient)와 같은 쿠키를 읽고 쓰기 때문에,
// 여기서 세션을 만들면(예: exchangeCodeForSession) 브라우저가 그 세션을
// 그대로 이어받는다.
export async function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}
