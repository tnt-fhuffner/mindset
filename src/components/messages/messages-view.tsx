"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConversations, useMessages, useSendMessage } from "@/hooks/use-social";
import { useProfile } from "@/hooks/use-profile";
import { useSupabase } from "@/hooks/use-supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatRelative, initials } from "@/lib/utils";
import type { Conversation } from "@/types";

export function MessagesView() {
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("with");
  const { data: me } = useProfile();
  const { data: conversations, refetch } = useConversations();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [desktop, setDesktop] = useState(false);
  const send = useSendMessage();
  const [text, setText] = useState("");
  const supabase = useSupabase();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const list = conversations ?? [];
  const active = list.find((item: Conversation) => item.id === activeId);
  const messages = useMessages(active?.id);
  const other = active?.other;
  const showThread = Boolean(activeId) || Boolean(requested);

  async function openWith(userId: string) {
    const { data, error } = await supabase.rpc("get_or_create_conversation", { other_user: userId });
    if (error) return;
    await refetch();
    setActiveId(data as string);
    router.replace("/messages", { scroll: false });
  }

  useEffect(() => {
    if (requested) void openWith(requested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requested]);

  useEffect(() => {
    if (!desktop || activeId || !conversations?.[0]?.id) return;
    setActiveId(conversations[0].id);
  }, [desktop, activeId, conversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.data?.length, active?.id]);

  return (
    <div className="grid h-full grid-cols-1 overflow-hidden md:grid-cols-[280px_1fr]">
      <aside className={cn("flex min-h-0 flex-col border-r", showThread && "hidden md:flex")}>
        <div className="border-b px-4 py-3 font-semibold">Mensagens</div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {list.length === 0 && (
            <p className="px-4 py-8 text-sm text-muted-foreground">
              Nenhuma conversa ainda. Abra um perfil e toque em Mensagem.
            </p>
          )}
          {list.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => setActiveId(conversation.id)}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted",
                active?.id === conversation.id && "bg-muted"
              )}
            >
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={conversation.other?.avatar_url ?? undefined} />
                <AvatarFallback>{initials(conversation.other?.display_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{conversation.other?.display_name}</p>
                  {conversation.unread ? (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                  ) : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">{conversation.last_message?.content}</p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className={cn("flex min-h-0 min-w-0 flex-col bg-background", !showThread && "hidden md:flex")}>
        {active && other ? (
          <>
            <div className="flex shrink-0 items-center gap-2 border-b px-2 py-2 md:px-4 md:py-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 md:hidden"
                aria-label="Voltar para conversas"
                onClick={() => setActiveId(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={other.avatar_url ?? undefined} />
                <AvatarFallback>{initials(other.display_name)}</AvatarFallback>
              </Avatar>
              <p className="min-w-0 truncate text-sm font-semibold">{other.display_name}</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
              <div className="space-y-2">
                {(messages.data ?? []).map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm sm:max-w-[75%]",
                      message.sender_id === me?.id ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    <p className="mt-1 text-[10px] opacity-70">{formatRelative(message.created_at)}</p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </div>
            <form
              className="flex shrink-0 gap-2 border-t bg-background p-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!text.trim() || !active || !other || send.isPending) return;
                send.mutate({ conversationId: active.id, receiverId: other.id, content: text.trim() });
                setText("");
              }}
            >
              <Input
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Escreva uma mensagem"
                enterKeyHint="send"
                autoComplete="off"
                className="min-w-0 text-base md:text-sm"
              />
              <Button type="submit" className="shrink-0 px-3 sm:px-4" disabled={!text.trim() || send.isPending} aria-label="Enviar">
                <Send className="sm:hidden" />
                <span className="hidden sm:inline">Enviar</span>
              </Button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
            {requested ? "Abrindo conversa…" : "Escolha uma conversa ou envie uma mensagem a partir de um perfil."}
          </div>
        )}
      </section>
    </div>
  );
}
