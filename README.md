# RE:TRACK (서울 정비사업 레이더)

> 서울시 재개발·재건축 등 정비사업의 진행 단계와 최근 공고·인가·계획 변경 등의 변동 이력을 한눈에 파악할 수 있는 인텔리전스 서비스입니다.

---

## 📌 핵심 기능

1. **사업장 통합 검색**: 사업장 이름 또는 도로명/지번 주소로 원하는 정비사업장 즉시 검색
2. **오늘 & 최근의 변화 피드**: 서울 시간대 기준 당일 공고 및 최근 7일/30일/전체 기간별 변화 타임라인
3. **진행 단계 및 상세 타임라인**: 정비계획 수립부터 조합설립, 사업시행인가, 관리처분, 착공, 준공까지의 단계 추적
4. **원문 근거(Source Proof) 제공**: 각 이벤트 및 공고에 대한 서울시 공공데이터/정보몽땅 원문 링크 제공
5. **다양한 필터 탐색**: 기간, 중요도, 변화 유형(공고/인가 등), 사업 유형, 추진 단계별 필터링

---

## 🛠️ 기술 스택

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Backend / Database**: Supabase (PostgreSQL, Row Level Security)
- **Data Pipeline**: Node.js ESM Scripts (서울시 Open API, 서울시 정비사업 정보몽땅 연동)

---

## 🚀 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 복사하여 `.env.local`을 생성하고 필요한 키를 입력합니다.

```bash
cp .env.example .env.local
```

`.env.local` 설정 항목:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SEOUL_OPENAPI_KEY=your-seoul-openapi-key
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

---

## 📊 데이터 파이프라인

서울시 공공데이터와 정보몽땅에서 데이터를 수집하여 SQL을 생성합니다.

```bash
# 서울시 도시계획 정비사업 기본 사업장 데이터 수집
npm run data:projects

# 서울시 도시계획 시행계획 공고 이벤트 매칭 및 수집
npm run data:events

# 서울시 정보몽땅 사업장 추진단계 매칭 및 수집
npm run data:stages
```

생성된 SQL 파일은 `/tmp/` 디렉터리에 저장되며, Supabase SQL Editor 또는 CLI를 통해 적용할 수 있습니다.

---

## 🗄️ 데이터베이스 구조

- `projects`: 정비사업장 기본 정보 (이름, 주소, 자치구, 사업 유형, 현재 상태 등)
- `project_stages`: 사업장별 추진 단계 및 인가 일자
- `events`: 사업장별 공고, 인가, 계획 변경 등 발생 이벤트 및 원문 링크
- `users`: 사용자 계정 정보
- `subscriptions`: 사용자의 관심 사업장 구독 및 알림 설정

마이그레이션 파일은 `supabase/migrations/`에 위치합니다.

---

## 🧪 코드 검증

```bash
npm run lint
npm run build
```
