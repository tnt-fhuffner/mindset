"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Heart, Link2, MessageCircle, MoreHorizontal, Repeat2, Share2, Flag } from "lucide-react";
import { toast } from "sonner";
import { PostCover } from "@/components/feed/post-cover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAddComment, useComments, useToggleLike } from "@/hooks/use-feed";
import { createClient } from "@/lib/supabase/client";
import { insertPost } from "@/lib/posts";
import { formatRelative, initials } from "@/lib/utils";
import type { Post } from "@/types";

export function PostCard({ post }: { post: Post }) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const like = useToggleLike();
  const addComment = useAddComment();
  const comments = useComments(open ? post.id : undefined);
  const [text, setText] = useState("");
  const author = post.author;
  const shareUrl = typeof window === "undefined" ? "" : `${window.location.origin}/feed?post=${post.id}`;

  useEffect(() => {
    if (!menuOpen) return;
    function onPointer(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function download() {
    const supabase = createClient();
    await supabase.rpc("increment_download", { p_post_id: post.id });
    if (post.file_url) window.open(post.file_url, "_blank");
    else if (post.link_url) window.open(post.link_url, "_blank");
    else if (post.mind_map?.share_token) window.open(`/s/${post.mind_map.share_token}`, "_blank");
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link copiado.");
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, url: shareUrl, text: post.description ?? post.title });
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    await copyLink();
  }

  async function repost() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Faça login para repostar.");
      return;
    }
    const { error } = await insertPost({
      author_id: user.id,
      type: post.type,
      title: post.title.startsWith("Repost:") ? post.title : `Repost: ${post.title}`,
      description: post.description,
      file_url: post.file_url,
      file_path: post.file_path,
      file_mime: post.file_mime,
      file_size: post.file_size,
      thumbnail_url: post.thumbnail_url,
      link_url: post.link_url,
      mind_map_id: post.mind_map_id,
    });
    if (error) toast.error(error.message);
    else {
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      toast.success("Repostado no seu perfil.");
    }
  }

  async function report() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    if (!confirm("Enviar esta publicação para a moderação?")) return;
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: "post",
      target_id: post.id,
      reason: "Conteúdo inadequado",
    });
    if (error) toast.error(error.message);
    else toast.success("Denúncia enviada à moderação.");
  }

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <Link href={author ? `/u/${author.username}` : "#"}>
          <Avatar>
            <AvatarImage src={author?.avatar_url ?? undefined} alt={author?.display_name} />
            <AvatarFallback>{initials(author?.display_name)}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <Link href={author ? `/u/${author.username}` : "#"} className="font-semibold hover:underline">
              {author?.display_name}
            </Link>
            <span className="text-muted-foreground">@{author?.username}</span>
            <span className="text-muted-foreground">· {formatRelative(post.created_at)}</span>
            <div className="relative ml-auto" ref={menuRef}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                aria-label="Mais opções"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((value) => !value)}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-1 w-52 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                    onClick={() => {
                      setMenuOpen(false);
                      void share();
                    }}
                  >
                    <Share2 className="mr-2 h-4 w-4" /> Compartilhar
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                    onClick={() => {
                      setMenuOpen(false);
                      void copyLink();
                    }}
                  >
                    <Link2 className="mr-2 h-4 w-4" /> Copiar link
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                    onClick={() => {
                      setMenuOpen(false);
                      void repost();
                    }}
                  >
                    <Repeat2 className="mr-2 h-4 w-4" /> Repostar
                  </button>
                  <div className="my-1 h-px bg-border" />
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-muted"
                    onClick={() => {
                      setMenuOpen(false);
                      void report();
                    }}
                  >
                    <Flag className="mr-2 h-4 w-4" /> Denunciar
                  </button>
                </div>
              )}
            </div>
          </div>
          <h2 className="mt-2 text-base font-semibold">{post.title}</h2>
          {post.description && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{post.description}</p>}
          <PostCover post={post} />
          <div className="mt-3 flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => like.mutate({ postId: post.id, liked: Boolean(post.liked_by_me) })}
            >
              <Heart className={post.liked_by_me ? "fill-destructive text-destructive" : ""} />
              {post.like_count ?? 0}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOpen((value) => !value)}>
              <MessageCircle /> {post.comment_count ?? 0}
            </Button>
            <Button variant="ghost" size="sm" onClick={download}>
              <Download /> {post.download_count}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void share()}>
              <Share2 />
            </Button>
          </div>
          {open && (
            <div className="mt-3 space-y-3">
              {(comments.data ?? []).map((comment) => (
                <div key={comment.id} className="rounded-md bg-muted/60 px-3 py-2 text-sm">
                  <p className="font-medium">{comment.author?.display_name}</p>
                  <p>{comment.content}</p>
                  {comment.replies?.map((reply) => (
                    <div key={reply.id} className="mt-2 ml-4 border-l pl-3">
                      <p className="font-medium">{reply.author?.display_name}</p>
                      <p>{reply.content}</p>
                    </div>
                  ))}
                </div>
              ))}
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!text.trim()) return;
                  addComment.mutate({ postId: post.id, content: text });
                  setText("");
                }}
              >
                <Textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Escreva um comentário" rows={2} />
                <Button type="submit">Enviar</Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
