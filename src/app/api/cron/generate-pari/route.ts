import { generateDailyMatches } from "@/app/admin-chif-pam/pari/services/matchEngine";

export async function GET(request: Request) {
  try {
    await generateDailyMatches();

    return new Response(
      JSON.stringify({
        success: true,
        message: "10 matchs générés avec succès",
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Erreur cron pari:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "Erreur génération matchs",
      }),
      { status: 500 }
    );
  }
}
