"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Post } from "@/types";

export function PostContent({ post }: { post: Post }) {
  if (post.type === "image" && post.file_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={post.file_url} alt={post.title} className="w-full rounded-xl border object-contain" />
    );
  }

  if ((post.type === "pdf" || post.file_mime === "application/pdf" || post.file_url?.toLowerCase().endsWith(".pdf")) && post.file_url) {
    return (
      <div className="space-y-3">
        <iframe title={post.title} src={`${post.file_url}#toolbar=1`} className="h-[80vh] w-full rounded-xl border bg-background" />
        <Button asChild variant="outline">
          <a href={post.file_url} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" /> Abrir PDF
          </a>
        </Button>
      </div>
    );
  }

  if (post.type === "ebook" && post.file_url) {
    return (
      <div className="rounded-xl border p-6">
        <p className="text-sm text-muted-foreground">E-book anexado nesta publicação.</p>
        <Button asChild className="mt-3">
          <a href={post.file_url} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" /> Baixar arquivo
          </a>
        </Button>
      </div>
    );
  }

  if (post.type === "link" && post.link_url) {
    return (
      <div className="rounded-xl border p-6">
        <p className="break-all text-sm text-muted-foreground">{post.link_url}</p>
        <Button asChild className="mt-3">
          <a href={post.link_url} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" /> Abrir link
          </a>
        </Button>
      </div>
    );
  }

  if (post.type === "map" && post.mind_map?.share_token) {
    return (
      <div className="space-y-3">
        <iframe title={post.mind_map.title} src={`/s/${post.mind_map.share_token}`} className="h-[70vh] w-full rounded-xl border" />
        <Button asChild variant="outline">
          <Link href={`/s/${post.mind_map.share_token}`}>Abrir mapa</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-6">
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.description || "Esta publicação não tem arquivo anexado."}</p>
    </div>
  );
}
