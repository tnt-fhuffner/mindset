import { BookOpen, FileText, ImageIcon, Link2, Map as MapIcon } from "lucide-react";
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
  const cover = coverUrl(post);
  const Icon = ICONS[post.type] ?? FileText;
  const href = post.file_url || post.link_url || (post.mind_map ? `/s/${post.mind_map.share_token}` : undefined);
  const inner = cover ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={cover} alt="" className="h-full w-full object-cover" />
  ) : (
    <div className="flex h-full flex-col justify-between bg-gradient-to-br from-indigo-800 to-teal-800 p-4 text-white">
      <Icon className="h-6 w-6 opacity-80" />
      <div>
        <p className="text-[11px] uppercase tracking-wide opacity-80">{label(post)}</p>
        <p className="mt-1 line-clamp-2 text-sm font-semibold">{post.title}</p>
      </div>
    </div>
  );

  const className = "mt-3 block overflow-hidden rounded-xl border bg-muted aspect-[16/9]";
  if (href) {
    return (
      <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={className}>
        {inner}
      </a>
    );
  }
  return <div className={className}>{inner}</div>;
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
  if (post.type === "link") return post.link_url ? new URL(post.link_url).hostname : "Link";
  if (post.type === "image") return "Imagem";
  return "Artigo";
}
