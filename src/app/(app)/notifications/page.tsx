"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/use-social";
import { formatRelative } from "@/lib/utils";

const LABELS: Record<string, string> = {
  post: "publicou algo novo",
  like: "curtiu sua publicação",
  comment: "comentou em sua publicação",
  follow: "começou a seguir você",
  message: "enviou uma mensagem",
  mention: "mencionou você",
  report: "atualização de moderação",
};

export default function NotificationsPage() {
  const { data, markAllRead } = useNotifications();

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-4 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Notificações</h1>
        <Button variant="outline" onClick={() => markAllRead.mutate()}>
          Marcar como lidas
        </Button>
      </div>
      {(data ?? []).map((item) => (
        <div key={item.id} className="rounded-xl border bg-card p-4 text-sm">
          <p>
            <span className="font-medium">{item.actor?.display_name ?? "Alguém"}</span>{" "}
            {LABELS[item.type] ?? item.type}
          </p>
          <p className="text-xs text-muted-foreground">{formatRelative(item.created_at)}</p>
          {item.type === "message" && (
            <Link href="/messages" className="mt-2 inline-block text-primary underline">
              Abrir conversa
            </Link>
          )}
          {item.type === "post" && item.post_id && (
            <Link href={`/feed/${item.post_id}`} className="mt-2 inline-block text-primary underline">
              Ver publicação
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
