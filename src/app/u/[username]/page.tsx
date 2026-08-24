import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";
import { PublicProfile } from "@/components/profile/public-profile";
import type { MindMap, Post, Profile } from "@/types";

export default async function UserProfilePage({ params }: { params: { username: string } }) {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("username", params.username).maybeSingle();
  if (!profile || profile.is_blocked) notFound();

  const [{ data: posts }, { data: maps }] = await Promise.all([
    supabase.from("posts").select("*").eq("author_id", profile.id).order("created_at", { ascending: false }),
    supabase.from("mind_maps").select("*").eq("owner_id", profile.id).eq("visibility", "public").order("updated_at", { ascending: false }),
  ]);

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <Link href="/">
          <Logo />
        </Link>
        <Link href="/feed" className="text-sm text-primary underline">
          Timeline
        </Link>
      </header>
      <PublicProfile profile={profile as Profile} posts={(posts ?? []) as Post[]} maps={(maps ?? []) as MindMap[]} />
    </div>
  );
}
