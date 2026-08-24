"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { buildMindMapFromOutline } from "@/lib/mind-map";
import type { MindMapContent } from "@/types";

type Message = { role: "user" | "assistant"; content: string };

export function AiAssistantPanel({
  onApply,
  remaining,
  limit,
}: {
  onApply: (content: MindMapContent, title?: string) => void;
  remaining: number;
  limit: number;
}) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  async function generate(mode: "structure" | "expand") {
    if (!prompt.trim()) return;
    setLoading(true);
    const nextMessages = [...messages, { role: "user" as const, content: prompt }];
    setMessages(nextMessages);
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, mode }),
      });
      const raw = await response.text();
      let payload: { error?: string; title?: string; summary?: string; nodes?: unknown[] } = {};
      try {
        payload = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error(
          raw?.trim()
            ? "A API da IA devolveu uma resposta inválida."
            : "A API da IA não respondeu. Confira ANTHROPIC_API_KEY na Vercel e o SQL consume_ai_credit no Supabase."
        );
      }
      if (!response.ok) throw new Error(payload.error ?? "Falha ao gerar com IA.");
      onApply(
        buildMindMapFromOutline(payload.title ?? "Mapa gerado", payload.nodes ?? []),
        payload.title
      );
      setMessages((current) => [
        ...current,
        { role: "assistant", content: payload.summary ?? "Estrutura aplicada ao mapa." },
      ]);
      setPrompt("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro na IA.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="flex h-full w-full flex-col border-l bg-card md:w-80">
      <div className="border-b px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" /> Assistente de IA
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {remaining} de {limit} gerações grátis neste mês
        </p>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Cole um texto, um tema ou descreva um organograma. A IA monta os nós e conexões.
            </p>
          )}
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={
                message.role === "user"
                  ? "rounded-lg bg-primary/10 px-3 py-2 text-sm"
                  : "rounded-lg bg-muted px-3 py-2 text-sm"
              }
            >
              {message.content}
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="space-y-2 border-t p-3">
        <Textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ex: mapa mental sobre hábito de leitura"
          rows={4}
        />
        <div className="flex gap-2">
          <Button className="flex-1" disabled={loading || remaining <= 0} onClick={() => generate("structure")}>
            Gerar com IA
          </Button>
          <Button variant="outline" disabled={loading || remaining <= 0} onClick={() => generate("expand")}>
            Sugerir
          </Button>
        </div>
      </div>
    </aside>
  );
}
