"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PostCover } from "@/components/feed/post-cover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useFollow } from "@/hooks/use-feed";
import { useFollowCounts } from "@/hooks/use-people";
import { useProfile } from "@/hooks/use-profile";
import { formatRelative, initials } from "@/lib/utils";
import type { MindMap, Post, Profile } from "@/types";

export function PublicProfile({
  profile,
  posts,
  maps,
}: {
  profile: Profile;
  posts: Post[];
  maps: MindMap[];
}) {
  const { data: me } = useProfile();
  const follow = useFollow(profile.id);
  const counts = useFollowCounts(profile.id);
  const router = useRouter();
  const isSelf = me?.id === profile.id;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Avatar className="h-16 w-16">
          <AvatarImage src={profile.avatar_url ?? undefined} />
          <AvatarFallback>{initials(profile.display_name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">{profile.display_name}</h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{counts.data?.followers ?? 0}</span> seguidores
            <span className="mx-2">·</span>
            <span className="font-medium text-foreground">{counts.data?.following ?? 0}</span> seguindo
          </p>
          {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}
        </div>
        {!isSelf && me && (
          <div className="flex w-full gap-2 sm:w-auto sm:flex-col">
            <Button className="flex-1 sm:flex-none" variant={follow.data ? "outline" : "default"} onClick={() => follow.toggle.mutate(Boolean(follow.data))}>
              {follow.data ? "Seguindo" : "Seguir"}
            </Button>
            <Button className="flex-1 sm:flex-none" variant="outline" onClick={() => router.push(`/messages?with=${profile.id}`)}>
              Mensagem
            </Button>
          </div>
        )}
      </div>
      <section>
        <h2 className="mb-3 font-semibold">Mapas públicos</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {maps.map((map) => (
            <Link key={map.id} href={`/s/${map.share_token}`}>
              <Card className="p-4">
                <p className="font-medium">{map.title}</p>
                <p className="text-xs text-muted-foreground">{formatRelative(map.updated_at)}</p>
              </Card>
            </Link>
          ))}
          {maps.length === 0 && <p className="text-sm text-muted-foreground">Nenhum mapa público.</p>}
        </div>
      </section>
      <section>
        <h2 className="mb-3 font-semibold">Publicações</h2>
        <div className="space-y-3">
          {posts.map((post) => (
            <Card key={post.id} className="p-4">
              <Link href={`/feed/${post.id}`} className="font-medium hover:underline">
                {post.title}
              </Link>
              {post.description && (
                <p className="line-clamp-2 text-sm text-muted-foreground">{post.description}</p>
              )}
              <PostCover post={post} />
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
