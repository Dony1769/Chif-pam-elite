// /app/api/create-ticket/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { matchId, userId, betType, stake } = body;

    if (!matchId || !userId || !betType || !stake) {
      return NextResponse.json({ success: false, message: "Paramètres manquants" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("tickets")
      .insert([{ match_id: matchId, user_id: userId, bet_type: betType, stake }]);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, ticket: data });
  } catch (error: any) {
    console.error("Erreur create-ticket API:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
