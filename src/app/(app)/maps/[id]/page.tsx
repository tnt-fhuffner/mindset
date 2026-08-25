import { notFound } from "next/navigation";
import { MindMapEditor } from "@/components/maps/mind-map-editor";
import { AI_MONTHLY_LIMIT } from "@/lib/constants";
import { currentMonthKey } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import type { MindMap } from "@/types";

export default async function MapEditorPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: map } = await supabase.from("mind_maps").select("*").eq("id", params.id).maybeSingle();
  if (!map) notFound();

  const { data: usage } = user
    ? await supabase
        .from("ai_usage")
        .select("used")
        .eq("user_id", user.id)
        .eq("month", currentMonthKey())
        .maybeSingle()
    : { data: null };

  const used = usage?.used ?? 0;
  const remaining = Math.max(AI_MONTHLY_LIMIT - used, 0);
  const isOwner = user?.id === map.owner_id;
  const canEdit = Boolean(isOwner || (user && map.collaborative && map.visibility !== "private"));

  return (
    <div className="h-[calc(100vh-4rem)]">
      <MindMapEditor
        map={map as MindMap}
        readOnly={!canEdit}
        isOwner={isOwner}
        remaining={remaining}
        limit={AI_MONTHLY_LIMIT}
      />
    </div>
  );
}
