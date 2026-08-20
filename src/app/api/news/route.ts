import { NextResponse } from "next/server";
import { fetchLatestRenewalNews } from "@/lib/services/news";

export const revalidate = 300; // 5 minutes cache

export async function GET() {
  const news = await fetchLatestRenewalNews();
  return NextResponse.json({ news });
}
