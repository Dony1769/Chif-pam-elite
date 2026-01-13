import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { floor } = await req.json();
    
    // Difficulté progressive selon l'étage
    const difficulty = floor > 5 ? "très difficile" : "modérée";

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Tu es le maître de l'Ascenseur Infernal. Génère une question de culture générale en français (Haiti, Science, Histoire, ou Art). Format JSON unique: { 'q': 'question', 'a': ['rep1', 'rep2', 'rep3', 'rep4'], 'c': index_bonne_reponse_0_a_3 }"
        },
        { role: "user", content: `Génère une question de difficulté ${difficulty}.` }
      ],
      response_format: { type: "json_object" }
    });

    return NextResponse.json(JSON.parse(response.choices[0].message.content!));
  } catch (error) {
    return NextResponse.json({ error: "Erreur IA" }, { status: 500 });
  }
}

