import { notFound } from "next/navigation";
import { PostView } from "@/components/feed/post-view";
import { createClient } from "@/lib/supabase/server";
import type { Post } from "@/types";

export const dynamic = "force-dynamic";

export default async function PostPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*, author:profiles!posts_author_id_fkey(*), mind_map:mind_maps(id,title,share_token,visibility,thumbnail_url)")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !data) notFound();
  return <PostView post={data as Post} />;
}
