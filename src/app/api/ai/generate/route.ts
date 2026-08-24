import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { AI_MONTHLY_LIMIT } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

const SYSTEM = `Você gera estruturas de mapas mentais e organogramas.
Responda APENAS um JSON válido no formato:
{
  "title": "string",
  "summary": "string curta em pt-BR",
  "nodes": [
    { "id": "root", "label": "tema", "parentId": null, "color": "#4f46e5", "icon": "sparkles" }
  ]
}
Regras:
- O primeiro nó deve ter id "root" e parentId null.
- Crie entre 6 e 16 nós.
- ids únicos, curtos.
- parentId referencia um id existente.
- icon em: sparkles, book, lightbulb, target, users, flag.
- Linguagem em português.`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const limited = rateLimit(`ai:${user.id}`, 8, 10 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Muitas solicitações. Tente novamente em alguns minutos." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const prompt = String(body.prompt ?? "").slice(0, 8000);
  const mode = body.mode === "expand" ? "expand" : "structure";
  if (prompt.length < 3) {
    return NextResponse.json({ error: "Descreva o tema com mais detalhes." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "IA não configurada. Defina ANTHROPIC_API_KEY no servidor." },
      { status: 503 }
    );
  }

  const { data: credit, error: creditError } = await supabase.rpc("consume_ai_credit", {
    p_limit: AI_MONTHLY_LIMIT,
  });
  if (creditError) return NextResponse.json({ error: creditError.message }, { status: 400 });
  const row = Array.isArray(credit) ? credit[0] : credit;
  if (!row?.allowed) {
    return NextResponse.json(
      { error: "Você atingiu o limite gratuito de gerações deste mês.", used: row?.used, limit: AI_MONTHLY_LIMIT },
      { status: 402 }
    );
  }

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest",
    max_tokens: 2000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content:
          mode === "expand"
            ? `Sugira subtópicos e reorganize esta ideia em um organograma/mapa mental:\n${prompt}`
            : `Gere a estrutura completa do mapa mental para:\n${prompt}`,
      },
    ],
  });

  const text = message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n");
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd < 0) {
    return NextResponse.json({ error: "A IA não retornou um mapa válido." }, { status: 502 });
  }

  try {
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    return NextResponse.json({ ...parsed, used: row.used, limit: AI_MONTHLY_LIMIT });
  } catch {
    return NextResponse.json({ error: "Não foi possível interpretar a resposta da IA." }, { status: 502 });
  }
}
