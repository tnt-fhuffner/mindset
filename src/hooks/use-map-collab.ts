"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MindMapContent } from "@/types";

export type MapPeer = { id: string; name: string; color: string };

function fingerprint(content: MindMapContent, title: string) {
  return JSON.stringify({ title, nodes: content.nodes, edges: content.edges });
}

export function useMapCollab({
  mapId,
  enabled,
  self,
  onRemote,
}: {
  mapId: string;
  enabled: boolean;
  self?: { id: string; name: string } | null;
  onRemote: (content: MindMapContent, title: string) => void;
}) {
  const [peers, setPeers] = useState<MapPeer[]>([]);
  const ignoreUntil = useRef(0);
  const lastHash = useRef("");
  const onRemoteRef = useRef(onRemote);
  onRemoteRef.current = onRemote;

  function markLocal(content: MindMapContent, title: string) {
    lastHash.current = fingerprint(content, title);
    ignoreUntil.current = Date.now() + 1800;
  }

  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    const channel = supabase.channel(`map:${mapId}`, {
      config: { presence: { key: self?.id ?? crypto.randomUUID() } },
    });

    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "mind_maps", filter: `id=eq.${mapId}` },
      (payload) => {
        if (Date.now() < ignoreUntil.current) return;
        const row = payload.new as { content?: MindMapContent; title?: string };
        if (!row.content) return;
        const hash = fingerprint(row.content, row.title ?? "");
        if (hash === lastHash.current) return;
        lastHash.current = hash;
        onRemoteRef.current(row.content, row.title ?? "");
      }
    );

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState() as Record<string, MapPeer[]>;
      const next: MapPeer[] = [];
      for (const entries of Object.values(state)) {
        const peer = entries[0];
        if (peer && peer.id !== self?.id) next.push(peer);
      }
      setPeers(next.slice(0, 8));
    });

    channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED" || !self) return;
      await channel.track({
        id: self.id,
        name: self.name,
        color: "#4f46e5",
      });
    });

    return () => {
      void supabase.removeChannel(channel);
      setPeers([]);
    };
  }, [enabled, mapId, self?.id, self?.name]);

  return { peers, markLocal };
}
