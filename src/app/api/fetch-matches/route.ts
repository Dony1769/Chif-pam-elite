// /app/api/fetch-matches/route.ts
import { NextResponse } from "next/server";
import { fetchTodayMatches } from "@/services/fetchMatches";

export async function GET() {
  try {
    const matches = await fetchTodayMatches();
    return NextResponse.json({ success: true, matches });
  } catch (error: any) {
    console.error("Erreur fetch matches API:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
