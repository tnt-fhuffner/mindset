"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { emptyMindMap } from "@/lib/mind-map";
import type { Folder, MindMap, MindMapContent } from "@/types";

export function useFolders() {
  const supabase = createClient();
  return useQuery({
    queryKey: ["folders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Folder[];
    },
  });
}

export function useMindMaps(folderId?: string | null) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["maps", folderId ?? "all"],
    queryFn: async () => {
      let query = supabase.from("mind_maps").select("*").order("updated_at", { ascending: false });
      if (folderId) query = query.eq("folder_id", folderId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as MindMap[];
    },
  });
}

export function useMindMap(id?: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["map", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("mind_maps").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as MindMap;
    },
  });
}

export function useCreateMindMap() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { title?: string; folder_id?: string | null }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Faça login para criar mapas.");
      const { data, error } = await supabase
        .from("mind_maps")
        .insert({
          owner_id: user.id,
          title: input.title ?? "Mapa sem título",
          folder_id: input.folder_id ?? null,
          content: emptyMindMap(input.title ?? "Ideia central"),
        })
        .select("id")
        .single();
      if (error) throw error;
      return (data?.id as string) ?? "";
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maps"] });
    },
  });
}

export function useSaveMindMap() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      title?: string;
      content?: MindMapContent;
      visibility?: MindMap["visibility"];
      folder_id?: string | null;
      collaborative?: boolean;
    }) => {
      const { id, ...rest } = input;
      const first = await supabase.from("mind_maps").update(rest).eq("id", id);
      if (first.error && first.error.message.toLowerCase().includes("collaborative")) {
        const retry = { ...rest };
        delete retry.collaborative;
        const { error } = await supabase.from("mind_maps").update(retry).eq("id", id);
        if (error) throw error;
        return;
      }
      if (first.error) throw first.error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["map", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["maps"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteMindMap() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mind_maps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["maps"] }),
  });
}
