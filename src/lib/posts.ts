import { createClient } from "@/lib/supabase/client";

export async function insertPost(row: Record<string, unknown>) {
  const supabase = createClient();
  const first = await supabase.from("posts").insert(row);
  if (!first.error) return first;
  if (first.error.message.toLowerCase().includes("thumbnail")) {
    const rest = { ...row };
    delete rest.thumbnail_url;
    return supabase.from("posts").insert(rest);
  }
  return first;
}

export async function uploadBlob(file: File | Blob, filename: string) {
  const body = new FormData();
  body.append("file", file, filename);
  const response = await fetch("/api/upload", { method: "POST", body });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? "Falha no upload.");
  return payload as { publicUrl: string; path: string; mime: string; size: number };
}
