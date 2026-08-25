import { notFound, redirect } from "next/navigation";
import { PostComposer } from "@/components/feed/post-composer";
import { createClient } from "@/lib/supabase/server";
import type { Post } from "@/types";

export const dynamic = "force-dynamic";

export default async function EditPostPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("posts")
    .select("*, author:profiles!posts_author_id_fkey(*), mind_map:mind_maps(id,title,share_token,visibility,thumbnail_url)")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !data) notFound();
  if (data.author_id !== user.id) redirect(`/feed/${params.id}`);

  return <PostComposer post={data as Post} />;
}
