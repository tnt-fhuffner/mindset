"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BookOpen, FileText, ImageIcon, Link2, Map as MapIcon } from "lucide-react";
import { makePostThumbnail } from "@/lib/post-thumbnail";
import { buildAndUploadThumbnail, updatePost } from "@/lib/posts";
import { useProfile } from "@/hooks/use-profile";
import type { Post } from "@/types";

const ICONS = {
  pdf: FileText,
  ebook: BookOpen,
  article: FileText,
  link: Link2,
  image: ImageIcon,
  map: MapIcon,
};

export function PostCover({ post }: { post: Post }) {
  const { data: me } = useProfile();
  const [live, setLive] = useState<string | null>(null);
  const seen = useRef(false);
  const rootRef = useRef<HTMLAnchorElement>(null);
  const cover = live || coverUrl(post);
  const Icon = ICONS[post.type] ?? FileText;

  useEffect(() => {
    if (coverUrl(post) || seen.current) return;
    const pdf =
      post.type === "pdf" ||
      post.file_mime === "application/pdf" ||
      Boolean(post.file_url?.toLowerCase().includes(".pdf"));
    if (!pdf || !post.file_url) return;
    const el = rootRef.current;
    if (!el) return;

    const run = async () => {
      if (seen.current) return;
      seen.current = true;
      try {
        const response = await fetch(post.file_url!);
        if (!response.ok) return;
        const blob = await response.blob();
        const file = new File([blob], "file.pdf", { type: "application/pdf" });
        const thumb = await makePostThumbnail({ title: post.title, type: "pdf", file });
        setLive(URL.createObjectURL(thumb));
        if (me?.id === post.author_id) {
          const stored = await buildAndUploadThumbnail({
            title: post.title,
            type: "pdf",
            file,
            fileUrl: post.file_url,
          });
          if (stored) await updatePost(post.id, { thumbnail_url: stored });
        }
      } catch {
        seen.current = false;
      }
    };

    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        io.disconnect();
        void run();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [post, me?.id]);

  const inner = cover ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={cover} alt={post.title} className="h-full w-full object-cover" />
  ) : (
    <div className="flex h-full flex-col justify-between bg-gradient-to-br from-indigo-800 to-teal-800 p-4 text-white">
      <Icon className="h-6 w-6 opacity-80" />
      <div>
        <p className="text-[11px] uppercase tracking-wide opacity-80">{label(post)}</p>
        <p className="mt-1 line-clamp-2 text-sm font-semibold">{post.title}</p>
      </div>
    </div>
  );

  return (
    <Link
      ref={rootRef}
      href={`/feed/${post.id}`}
      className="mt-3 block overflow-hidden rounded-xl border bg-muted aspect-[16/9]"
    >
      {inner}
    </Link>
  );
}

function coverUrl(post: Post) {
  if (post.thumbnail_url) return post.thumbnail_url;
  if (post.type === "image" && post.file_url) return post.file_url;
  if (post.type === "map" && post.mind_map?.thumbnail_url) return post.mind_map.thumbnail_url;
  return null;
}

function label(post: Post) {
  if (post.type === "pdf") return "PDF";
  if (post.type === "ebook") return "E-book";
  if (post.type === "map") return "Mapa mental";
  if (post.type === "link") return post.link_url ? hostname(post.link_url) : "Link";
  if (post.type === "image") return "Imagem";
  return "Artigo";
}

function hostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "Link";
  }
}
