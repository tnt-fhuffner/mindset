"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConversations, useMessages, useSendMessage } from "@/hooks/use-social";
import { useProfile } from "@/hooks/use-profile";
import { useSupabase } from "@/hooks/use-supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatRelative, initials } from "@/lib/utils";
import type { Conversation } from "@/types";

export function MessagesView() {
  const params = useSearchParams();
  const requested = params.get("with");
  const { data: me } = useProfile();
  const { data: conversations, refetch } = useConversations();
  const [activeId, setActiveId] = useState<string | null>(null);
  const send = useSendMessage();
  const [text, setText] = useState("");
  const supabase = useSupabase();

  const active =
    (conversations ?? []).find((item: Conversation) => item.id === activeId) ?? conversations?.[0];
  const messages = useMessages(active?.id);

  const other = active?.other;

  async function openWith(userId: string) {
    const { data, error } = await supabase.rpc("get_or_create_conversation", { other_user: userId });
    if (error) return;
    await refetch();
    setActiveId(data as string);
  }

  useEffect(() => {
    if (requested) void openWith(requested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requested]);

  return (
    <div className="grid h-[calc(100vh-4rem)] grid-cols-1 md:grid-cols-[280px_1fr]">
      <aside className="border-r">
        <div className="border-b px-4 py-3 font-semibold">Mensagens</div>
        <ScrollArea className="h-[calc(100vh-7rem)]">
          {(conversations ?? []).map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setActiveId(conversation.id)}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted",
                active?.id === conversation.id && "bg-muted"
              )}
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={conversation.other?.avatar_url ?? undefined} />
                <AvatarFallback>{initials(conversation.other?.display_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{conversation.other?.display_name}</p>
                <p className="truncate text-xs text-muted-foreground">{conversation.last_message?.content}</p>
              </div>
            </button>
          ))}
        </ScrollArea>
      </aside>
      <section className="flex flex-col">
        {active && other ? (
          <>
            <div className="border-b px-4 py-3 text-sm font-semibold">{other.display_name}</div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-2">
                {(messages.data ?? []).map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                      message.sender_id === me?.id ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"
                    )}
                  >
                    <p>{message.content}</p>
                    <p className="mt-1 text-[10px] opacity-70">{formatRelative(message.created_at)}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <form
              className="flex gap-2 border-t p-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!text.trim() || !active || !other) return;
                send.mutate({ conversationId: active.id, receiverId: other.id, content: text });
                setText("");
              }}
            >
              <Input value={text} onChange={(event) => setText(event.target.value)} placeholder="Escreva uma mensagem" />
              <Button type="submit">Enviar</Button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Escolha uma conversa ou envie uma mensagem a partir de um perfil.
          </div>
        )}
      </section>
    </div>
  );
}
