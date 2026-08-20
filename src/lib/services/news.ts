export type NewsItem = {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  category: "정책/규제" | "구역 동향" | "신속통합" | "시장 분석";
};

const FALLBACK_NEWS: NewsItem[] = [
  {
    id: "fb-1",
    title: "서울시, 재건축·재개발 '그늘' 만들면 용적률 인센티브 부여 방안 추진",
    link: "https://news.google.com/",
    source: "한국주택경제",
    publishedAt: "2026.08.20",
    category: "정책/규제",
  },
  {
    id: "fb-2",
    title: "신정4동 922일대 재개발, 신속통합기획 확정…최고 29층 1,800세대 건립",
    link: "https://news.google.com/",
    source: "TBS 서울",
    publishedAt: "2026.08.20",
    category: "신속통합",
  },
  {
    id: "fb-3",
    title: "동작구 정비사업촉진위원회 출범…노량진·흑석 재개발·재건축 속도전",
    link: "https://news.google.com/",
    source: "연합뉴스",
    publishedAt: "2026.08.20",
    category: "구역 동향",
  },
  {
    id: "fb-4",
    title: "서울 재건축·재개발 조합설립 인가 단축…신통기획 패스트트랙 활성화",
    link: "https://news.google.com/",
    source: "비즈워치",
    publishedAt: "2026.08.19",
    category: "시장 분석",
  },
  {
    id: "fb-5",
    title: "압구정·여의도·목동 정비계획 열람 잇따라…서울 핵심지 정비사업 탄력",
    link: "https://news.google.com/",
    source: "매일경제",
    publishedAt: "2026.08.19",
    category: "구역 동향",
  },
  {
    id: "fb-6",
    title: "공사비 증액 갈등 완화 위한 서울시 정비사업 표준계약서 가이드라인 배포",
    link: "https://news.google.com/",
    source: "한국경제",
    publishedAt: "2026.08.18",
    category: "정책/규제",
  },
];

function decodeHtmlEntities(str: string): string {
  return str
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll(/<[^>]*>/g, "")
    .trim();
}

function determineCategory(title: string): NewsItem["category"] {
  if (/신속통합|신통|모아타운|모아주택/.test(title)) return "신속통합";
  if (/서울시|국토부|조례|규제|인센티브|가이드라인|용적률/.test(title)) return "정책/규제";
  if (/시장|전망|시세|공급|금리|분담금|수익/.test(title)) return "시장 분석";
  return "구역 동향";
}

function formatRelativeDate(pubDateStr: string): string {
  try {
    const date = new Date(pubDateStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return "방금 전";
    if (diffHours < 24) return `${diffHours}시간 전`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays <= 7) return `${diffDays}일 전`;

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}.${m}.${d}`;
  } catch {
    return "최근";
  }
}

export async function fetchLatestRenewalNews(): Promise<NewsItem[]> {
  try {
    const query = encodeURIComponent("서울 재개발 OR 재건축 OR 정비사업 OR 신속통합기획");
    const url = `https://news.google.com/rss/search?q=${query}&hl=ko&gl=KR&ceid=KR:ko`;

    const response = await fetch(url, {
      next: { revalidate: 300 }, // 5분 캐시
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ReTrackBot/1.0;)",
      },
    });

    if (!response.ok) return FALLBACK_NEWS;

    const xml = await response.text();
    const items = [...xml.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<pubDate>(.*?)<\/pubDate>[\s\S]*?<source[^>]*>(.*?)<\/source>/g)];

    if (!items.length) return FALLBACK_NEWS;

    const newsList: NewsItem[] = items.slice(0, 6).map((match, idx) => {
      let rawTitle = decodeHtmlEntities(match[1]);
      const rawLink = match[2].trim();
      const rawPubDate = match[3].trim();
      const rawSource = decodeHtmlEntities(match[4]);

      // Remove " - 언론사명" from the end of Google News titles
      if (rawTitle.includes(" - ")) {
        const parts = rawTitle.split(" - ");
        parts.pop();
        rawTitle = parts.join(" - ").trim();
      }

      return {
        id: `news-${idx}-${rawPubDate.slice(0, 10)}`,
        title: rawTitle,
        link: rawLink,
        source: rawSource || "부동산 주요 언론",
        publishedAt: formatRelativeDate(rawPubDate),
        category: determineCategory(rawTitle),
      };
    });

    return newsList.length > 0 ? newsList : FALLBACK_NEWS;
  } catch (err) {
    console.error("News fetch error:", err);
    return FALLBACK_NEWS;
  }
}
