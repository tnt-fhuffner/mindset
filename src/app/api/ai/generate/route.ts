import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { AI_MONTHLY_LIMIT } from "@/lib/constants";
import { currentMonthKey } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `Você gera estruturas de mapas mentais e organogramas.
Responda APENAS um JSON válido, sem markdown, no formato:
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

const MODELS = [
  process.env.ANTHROPIC_MODEL,
  "claude-sonnet-4-5",
  "claude-3-5-sonnet-latest",
  "claude-3-5-sonnet-20241022",
].filter((model, index, list): model is string => Boolean(model) && list.indexOf(model) === index);

function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Não autenticado.", 401);

    const limited = rateLimit(`ai:${user.id}`, 8, 10 * 60 * 1000);
    if (!limited.ok) {
      return jsonError("Muitas solicitações. Tente novamente em alguns minutos.", 429);
    }

    const body = await request.json().catch(() => ({}));
    const prompt = String(body.prompt ?? "").slice(0, 8000);
    const mode = body.mode === "expand" ? "expand" : "structure";
    if (prompt.length < 3) {
      return jsonError("Descreva o tema com mais detalhes.", 400);
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return jsonError("IA não configurada. Defina ANTHROPIC_API_KEY no servidor e faça Redeploy.", 503);
    }

    const { data: usage } = await supabase
      .from("ai_usage")
      .select("used")
      .eq("user_id", user.id)
      .eq("month", currentMonthKey())
      .maybeSingle();
    const alreadyUsed = (usage as { used?: number } | null)?.used ?? 0;
    if (alreadyUsed >= AI_MONTHLY_LIMIT) {
      return jsonError("Você atingiu o limite gratuito de gerações deste mês.", 402, {
        used: alreadyUsed,
        limit: AI_MONTHLY_LIMIT,
      });
    }

    const client = new Anthropic({ apiKey });
    const userContent =
      mode === "expand"
        ? `Sugira subtópicos e reorganize esta ideia em um organograma/mapa mental:\n${prompt}`
        : `Gere a estrutura completa do mapa mental para:\n${prompt}`;

    let text = "";
    let lastError = "Nenhum modelo Anthropic respondeu.";
    for (const model of MODELS) {
      try {
        const message = await client.messages.create({
          model,
          max_tokens: 2000,
          system: SYSTEM,
          messages: [{ role: "user", content: userContent }],
        });
        text = message.content.map((block) => (block.type === "text" ? block.text : "")).join("\n");
        if (text.trim()) break;
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Falha na API da Anthropic.";
      }
    }

    if (!text.trim()) {
      return jsonError(`A IA não respondeu. ${lastError}`, 502);
    }

    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd <= jsonStart) {
      return jsonError("A IA não retornou um mapa válido.", 502);
    }

    let parsed: { title?: string; summary?: string; nodes?: unknown };
    try {
      parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    } catch {
      return jsonError("Não foi possível interpretar a resposta da IA.", 502);
    }

    const { data: credit, error: creditError } = await supabase.rpc("consume_ai_credit", {
      p_limit: AI_MONTHLY_LIMIT,
    });
    if (creditError) return jsonError(creditError.message, 400);
    const row = Array.isArray(credit) ? credit[0] : credit;

    return NextResponse.json({
      ...parsed,
      used: row?.used ?? alreadyUsed + 1,
      limit: AI_MONTHLY_LIMIT,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Erro inesperado na IA.", 500);
  }
}
