"use client";

import Link from "next/link";
import { PostCard } from "@/components/feed/post-card";
import { PostContent } from "@/components/feed/post-content";
import type { Post } from "@/types";

export function PostView({ post }: { post: Post }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pb-24">
      <Link href="/feed" className="text-sm text-primary underline">
        Voltar à timeline
      </Link>
      <PostCard post={post} />
      <PostContent post={post} />
    </div>
  );
}
