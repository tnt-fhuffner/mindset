"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useFollow } from "@/hooks/use-feed";
import { initials } from "@/lib/utils";
import type { Profile } from "@/types";

export function PersonCard({ profile, compact = false }: { profile: Profile; compact?: boolean }) {
  const follow = useFollow(profile.id);
  const following = Boolean(follow.data);

  return (
    <div className="flex items-center gap-3 rounded-xl border p-3">
      <Link href={`/u/${profile.username}`}>
        <Avatar className={compact ? "h-9 w-9" : "h-11 w-11"}>
          <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.display_name} />
          <AvatarFallback>{initials(profile.display_name)}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/u/${profile.username}`} className="block truncate font-medium hover:underline">
          {profile.display_name}
        </Link>
        <p className="truncate text-sm text-muted-foreground">@{profile.username}</p>
        {!compact && profile.bio && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{profile.bio}</p>}
      </div>
      <Button
        size="sm"
        variant={following ? "outline" : "default"}
        disabled={follow.toggle.isPending}
        onClick={() => {
          follow.toggle.mutate(following, {
            onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível seguir."),
          });
        }}
      >
        {following ? "Seguindo" : "Seguir"}
      </Button>
    </div>
  );
}
