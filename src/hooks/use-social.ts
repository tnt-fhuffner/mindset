"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Conversation, Message, Notification, Profile } from "@/types";

export function useNotifications() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*, actor:profiles!notifications_actor_id_fkey(*)")
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
  });

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | undefined;
    supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id;
      if (!userId) return;
      channel = supabase
        .channel("notifications-realtime")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
        )
        .subscribe();
    });
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [queryClient, supabase]);

  const markAllRead = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return { ...query, markAllRead };
}

export function useConversations() {
  const supabase = createClient();
  return useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
        .order("last_message_at", { ascending: false });
      if (error) throw error;

      const rows = (data ?? []) as Conversation[];
      const otherIds = rows.map((row) => (row.participant_a === user.id ? row.participant_b : row.participant_a));
      const { data: profiles } = await supabase.from("profiles").select("*").in("id", otherIds.length ? otherIds : ["00000000-0000-0000-0000-000000000000"]);
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .in("conversation_id", rows.map((row) => row.id).concat("00000000-0000-0000-0000-000000000000"))
        .order("created_at", { ascending: false });

      const profileRows = (profiles ?? []) as Profile[];
      const messageRows = (messages ?? []) as Message[];

      return rows.map((row) => {
        const otherId = row.participant_a === user.id ? row.participant_b : row.participant_a;
        const convMessages = messageRows.filter((message) => message.conversation_id === row.id);
        return {
          ...row,
          other: profileRows.find((profile) => profile.id === otherId),
          last_message: convMessages[0] ?? null,
          unread: convMessages.filter((message) => message.receiver_id === user.id && !message.read_at).length,
        } satisfies Conversation;
      });
    },
  });
}

export function useMessages(conversationId?: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["messages", conversationId],
    enabled: Boolean(conversationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Message[];
    },
  });

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        () => queryClient.invalidateQueries({ queryKey: ["messages", conversationId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient, supabase]);

  return query;
}

export function useSendMessage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { conversationId: string; receiverId: string; content: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Faça login.");
      const { error } = await supabase.from("messages").insert({
        conversation_id: input.conversationId,
        sender_id: user.id,
        receiver_id: input.receiverId,
        content: input.content,
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
