"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";

function sanitizeSearch(value: string) {
  return value.replace(/[%_,()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export function usePeople(search = "") {
  const supabase = createClient();
  const term = sanitizeSearch(search);

  return useQuery({
    queryKey: ["people", term],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { profiles: [] as Profile[], followingIds: [] as string[] };

      const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
      const followingIds = ((follows ?? []) as { following_id: string }[]).map((row) => row.following_id);

      let query = supabase
        .from("profiles")
        .select("*")
        .eq("is_blocked", false)
        .neq("id", user.id)
        .order("created_at", { ascending: false })
        .limit(term ? 40 : 60);

      if (term) {
        query = query.or(`display_name.ilike.%${term}%,username.ilike.%${term}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const profiles = ((data ?? []) as Profile[]).sort((a, b) => {
        const aFollowed = followingIds.includes(a.id) ? 1 : 0;
        const bFollowed = followingIds.includes(b.id) ? 1 : 0;
        return aFollowed - bFollowed;
      });

      return { profiles, followingIds };
    },
  });
}

export function useFollowCounts(userId?: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["follow-counts", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const [{ count: followers }, { count: following }] = await Promise.all([
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId!),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId!),
      ]);
      return { followers: followers ?? 0, following: following ?? 0 };
    },
  });
}
