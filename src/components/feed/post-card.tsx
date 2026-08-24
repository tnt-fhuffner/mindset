"use client";

import Link from "next/link";
import { useState } from "react";
import { Download, Heart, Link2, MessageCircle, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAddComment, useComments, useToggleLike } from "@/hooks/use-feed";
import { createClient } from "@/lib/supabase/client";
import { formatRelative, initials } from "@/lib/utils";
import type { Post } from "@/types";

export function PostCard({ post }: { post: Post }) {
  const [open, setOpen] = useState(false);
  const like = useToggleLike();
  const addComment = useAddComment();
  const comments = useComments(open ? post.id : undefined);
  const [text, setText] = useState("");
  const author = post.author;

  async function download() {
    const supabase = createClient();
    await supabase.rpc("increment_download", { p_post_id: post.id });
    if (post.file_url) window.open(post.file_url, "_blank");
    else if (post.link_url) window.open(post.link_url, "_blank");
    else if (post.mind_map?.share_token) window.open(`/s/${post.mind_map.share_token}`, "_blank");
  }

  async function report() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
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
            <AvatarImage src={author?.avatar_url ?? undefined} />
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
            <button className="ml-auto text-muted-foreground" onClick={report} aria-label="Mais">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
          <h2 className="mt-2 text-base font-semibold">{post.title}</h2>
          {post.description && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{post.description}</p>}
          {post.type === "image" && post.file_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.file_url} alt={post.title} className="mt-3 max-h-96 w-full rounded-lg object-cover" />
          )}
          {post.type === "link" && post.link_url && (
            <a href={post.link_url} target="_blank" rel="noreferrer" className="mt-3 block truncate text-sm text-primary underline">
              {post.link_url}
            </a>
          )}
          {post.type === "map" && post.mind_map && (
            <Link href={`/s/${post.mind_map.share_token}`} className="mt-3 block rounded-lg border bg-muted/50 p-3 text-sm">
              Mapa mental: {post.mind_map.title}
            </Link>
          )}
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/feed?post=${post.id}`);
                toast.success("Link copiado.");
              }}
            >
              <Link2 />
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
