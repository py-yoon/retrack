/**
 * RE:TRACK 전체 데이터 통합 동기화 파이프라인 (Sync All Pipeline)
 *
 * 1. 서울시 정비사업장 수집 & 자치구 매칭 -> DB 반영
 * 2. 서울시 공고 이벤트 수집 & 사업장 매칭 -> DB 반영
 * 3. 서울시 정보몽땅 추진단계 수집 & 매칭 -> DB 반영
 * 4. 최종 DB 적재 상태 검증 및 요약 리포트 출력
 */

import { execSync } from "node:child_process";

console.log("========================================================");
console.log("🚀 [RE:TRACK] 전체 데이터 통합 동기화 파이프라인 실행 시작");
console.log("========================================================\n");

const startTime = Date.now();

try {
  // Step 1: Projects
  console.log("▶ [1/4] 서울시 도시계획 정비사업장 수집 및 SQL 생성 중...");
  execSync("node --env-file=.env.local scripts/build-seoul-import.mjs", { stdio: "inherit" });
  console.log("  ↳ 원격 DB에 사업장 데이터 반영 중...");
  execSync("npx supabase db query --linked --file /tmp/retrack-seoul-projects.sql", { stdio: "inherit" });
  console.log("  ✔ 사업장 데이터 동기화 완료!\n");

  // Step 2: Events
  console.log("▶ [2/4] 서울시 시행계획 공고 이벤트 수집 및 SQL 생성 중...");
  execSync("node --env-file=.env.local scripts/build-seoul-events-import.mjs", { stdio: "inherit" });
  console.log("  ↳ 원격 DB에 공고 이벤트 데이터 반영 중...");
  execSync("npx supabase db query --linked --file /tmp/retrack-seoul-events.sql", { stdio: "inherit" });
  console.log("  ✔ 공고 이벤트 데이터 동기화 완료!\n");

  // Step 3: Stages
  console.log("▶ [3/4] 서울시 정보몽땅 추진단계 수집 및 SQL 생성 중...");
  execSync("node --env-file=.env.local scripts/build-cleanup-stages-import.mjs", { stdio: "inherit" });
  console.log("  ↳ 원격 DB에 추진단계 데이터 반영 중...");
  execSync("npx supabase db query --linked --file /tmp/retrack-cleanup-stages.sql", { stdio: "inherit" });
  console.log("  ✔ 추진단계 데이터 동기화 완료!\n");

  // Step 4: Final verification
  console.log("▶ [4/4] 최종 DB 적재 상태 확인 중...");
  execSync(
    `npx supabase db query --linked "select (select count(*) from projects) as total_projects, (select count(district) from projects) as projects_with_district, (select count(*) from events) as total_events, (select count(*) from project_stages) as total_stages;"`,
    { stdio: "inherit" }
  );

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 [RE:TRACK] 전체 데이터 동기화가 성공적으로 완료되었습니다! (소요 시간: ${durationSec}초)`);
} catch (error) {
  console.error("\n❌ 데이터 동기화 파이프라인 실행 중 오류 발생:", error.message);
  process.exit(1);
}
