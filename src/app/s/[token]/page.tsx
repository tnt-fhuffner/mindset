import { notFound } from "next/navigation";
import Link from "next/link";
import { MindMapEditor } from "@/components/maps/mind-map-editor";
import { Logo } from "@/components/logo";
import { AI_MONTHLY_LIMIT } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { MindMap } from "@/types";

export default async function SharedMapPage({ params }: { params: { token: string } }) {
  const supabase = await createClient();
  const { data: map } = await supabase
    .from("mind_maps")
    .select("*")
    .eq("share_token", params.token)
    .maybeSingle();
  if (!map || map.visibility === "private") notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canEdit = Boolean(user && map.collaborative);

  return (
    <div className="h-dvh overflow-hidden">
      <header className="flex h-16 items-center justify-between gap-3 border-b px-4">
        <Link href="/">
          <Logo />
        </Link>
        <p className="min-w-0 truncate text-sm text-muted-foreground">
          {map.title}
          {canEdit ? " · edição conjunta" : ""}
        </p>
      </header>
      <div className="h-[calc(100dvh-4rem)]">
        <MindMapEditor
          map={map as MindMap}
          readOnly={!canEdit}
          isOwner={user?.id === map.owner_id}
          remaining={0}
          limit={AI_MONTHLY_LIMIT}
        />
      </div>
    </div>
  );
}
