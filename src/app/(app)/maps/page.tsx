"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { OnboardingDialog } from "@/components/onboarding-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCreateMindMap, useFolders, useMindMaps } from "@/hooks/use-maps";
import { useProfile } from "@/hooks/use-profile";
import { createClient } from "@/lib/supabase/client";
import { formatRelative } from "@/lib/utils";

export default function MapsPage() {
  const { data: profile } = useProfile();
  const maps = useMindMaps();
  const folders = useFolders();
  const createMap = useCreateMindMap();
  const router = useRouter();

  async function createFolder() {
    const name = window.prompt("Nome da pasta");
    if (!name || !profile) return;
    const supabase = createClient();
    const { error } = await supabase.from("folders").insert({ owner_id: profile.id, name });
    if (error) toast.error(error.message);
    else folders.refetch();
  }

  return (
    <div className="p-6 pb-24">
      {profile && <OnboardingDialog profile={profile} />}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Seus mapas</h1>
          <p className="text-sm text-muted-foreground">Pastas, visibilidade e edição na nuvem.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={createFolder}>
            <FolderPlus className="h-4 w-4" /> Pasta
          </Button>
          <Button
            onClick={async () => {
              const id = await createMap.mutateAsync({});
              router.push(`/maps/${id}`);
            }}
          >
            <Plus className="h-4 w-4" /> Novo mapa
          </Button>
        </div>
      </div>

      {(folders.data?.length ?? 0) > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {folders.data?.map((folder) => (
            <span key={folder.id} className="rounded-full border px-3 py-1 text-sm">
              {folder.name}
            </span>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(maps.data ?? []).map((map) => (
          <Link key={map.id} href={`/maps/${map.id}`}>
            <Card className="h-full p-4 transition hover:border-primary/40">
              <p className="font-semibold">{map.title}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{map.visibility}</p>
              <p className="mt-3 text-sm text-muted-foreground">Atualizado {formatRelative(map.updated_at)}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
