"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCreateMindMap } from "@/hooks/use-maps";

export default function NewMapPage() {
  const createMap = useCreateMindMap();
  const router = useRouter();

  useEffect(() => {
    createMap.mutateAsync({}).then((id) => router.replace(`/maps/${id}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <p className="p-8 text-sm text-muted-foreground">Criando mapa…</p>;
}
