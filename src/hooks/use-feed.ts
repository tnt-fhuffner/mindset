"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Comment, Post } from "@/types";

export function useFeed(mode: "all" | "following" = "all") {
  const supabase = createClient();
  return useQuery({
    queryKey: ["feed", mode],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let authorIds: string[] | null = null;
      if (mode === "following" && user) {
        const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);
        authorIds = ((follows ?? []) as { following_id: string }[]).map((row) => row.following_id);
        authorIds.push(user.id);
      }

      let query = supabase
        .from("posts")
        .select("*, author:profiles!posts_author_id_fkey(*), mind_map:mind_maps(id,title,share_token,visibility,thumbnail_url)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (authorIds) {
        query = query.in("author_id", authorIds.length ? authorIds : ["00000000-0000-0000-0000-000000000000"]);
      }

      const { data: posts, error } = await query;
      if (error) throw error;

      const list = (posts ?? []) as Post[];
      const ids = list.map((post) => post.id);
      if (!ids.length) return list;

      const [{ data: likes }, { data: comments }] = await Promise.all([
        supabase.from("likes").select("post_id, user_id").in("post_id", ids),
        supabase.from("comments").select("post_id").in("post_id", ids),
      ]);

      const likeRows = (likes ?? []) as { post_id: string; user_id: string }[];
      const commentRows = (comments ?? []) as { post_id: string }[];

      return list.map((post) => {
        const postLikes = likeRows.filter((like) => like.post_id === post.id);
        return {
          ...post,
          like_count: postLikes.length,
          comment_count: commentRows.filter((comment) => comment.post_id === post.id).length,
          liked_by_me: Boolean(user && postLikes.some((like) => like.user_id === user.id)),
        };
      });
    },
  });
}

export function useComments(postId?: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["comments", postId],
    enabled: Boolean(postId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*, author:profiles!comments_user_id_fkey(*)")
        .eq("post_id", postId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const all = (data ?? []) as Comment[];
      return all
        .filter((comment) => !comment.parent_id)
        .map((comment) => ({
          ...comment,
          replies: all.filter((reply) => reply.parent_id === comment.id),
        }));
    },
  });
}

export function useToggleLike() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { postId: string; liked: boolean }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Faça login para curtir.");
      if (input.liked) {
        const { error } = await supabase.from("likes").delete().eq("post_id", input.postId).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("likes").insert({ post_id: input.postId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
  });
}

export function useAddComment() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { postId: string; content: string; parentId?: string | null }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Faça login para comentar.");
      const { error } = await supabase.from("comments").insert({
        post_id: input.postId,
        user_id: user.id,
        content: input.content,
        parent_id: input.parentId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.postId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useFollow(userId?: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["follow", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !userId) return false;
      const { data } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", user.id)
        .eq("following_id", userId)
        .maybeSingle();
      return Boolean(data);
    },
  });

  const toggle = useMutation({
    mutationFn: async (following: boolean) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !userId) throw new Error("Faça login.");
      if (following) {
        const { error } = await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow", userId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["people"] });
      queryClient.invalidateQueries({ queryKey: ["follow-counts"] });
    },
  });

  return { ...query, toggle };
}
