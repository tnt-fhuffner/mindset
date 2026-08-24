"use client";

import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import type { AdminMetrics, Profile, Report } from "@/types";

export default function AdminPage() {
  const supabase = createClient();
  const metrics = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_metrics");
      if (error) throw error;
      return data as AdminMetrics;
    },
  });
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data as Profile[];
    },
  });
  const reports = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data as Report[];
    },
  });

  async function patch(body: Record<string, unknown>) {
    const response = await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) toast.error(payload.error);
    else {
      toast.success("Atualizado.");
      users.refetch();
      reports.refetch();
      metrics.refetch();
    }
  }

  async function remove(body: Record<string, unknown>) {
    if (!confirm("Confirmar remoção?")) return;
    const response = await fetch("/api/admin", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) toast.error(payload.error);
    else {
      toast.success("Removido.");
      users.refetch();
      reports.refetch();
    }
  }

  const m = metrics.data;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Painel administrativo</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Usuários" value={m?.users_total} />
        <Metric label="Ativos (30d)" value={m?.users_active_30d} />
        <Metric label="Publicações" value={m?.posts_total} />
        <Metric label="Downloads" value={m?.downloads_total} />
        <Metric label="Mapas" value={m?.maps_total} />
        <Metric label="IA no mês" value={m?.ai_used_month} />
        <Metric label="Denúncias abertas" value={m?.reports_open} />
        <Metric label="Comentários" value={m?.comments_total} />
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="reports">Denúncias</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="space-y-2">
          {(users.data ?? []).map((user) => (
            <div key={user.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
              <div>
                <p className="font-medium">{user.display_name} @{user.username}</p>
                <p className="text-muted-foreground">
                  {user.role} {user.is_blocked ? "· bloqueado" : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => patch({ action: "role", userId: user.id, role: user.role === "admin" ? "user" : "admin" })}
                >
                  {user.role === "admin" ? "Rebaixar" : "Promover"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => patch({ action: "block", userId: user.id, is_blocked: !user.is_blocked })}
                >
                  {user.is_blocked ? "Desbloquear" : "Bloquear"}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => remove({ targetType: "user", userId: user.id })}>
                  Remover
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="reports" className="space-y-2">
          {(reports.data ?? []).map((report) => (
            <div key={report.id} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">
                {report.target_type} · {report.status}
              </p>
              <p>{report.reason}</p>
              <p className="text-xs text-muted-foreground">{report.target_id}</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => patch({ action: "report", reportId: report.id, status: "dismissed" })}>
                  Dispensar
                </Button>
                <Button size="sm" variant="outline" onClick={() => patch({ action: "report", reportId: report.id, status: "reviewed" })}>
                  Revisado
                </Button>
                {report.target_type === "post" && (
                  <Button size="sm" variant="destructive" onClick={() => remove({ targetType: "post", postId: report.target_id })}>
                    Remover conteúdo
                  </Button>
                )}
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ label, value }: { label: string; value?: number }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value ?? "—"}</p>
    </Card>
  );
}
