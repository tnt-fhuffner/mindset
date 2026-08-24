import { validateUpload } from "@/lib/file-validation";
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
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const asFile =
    file instanceof File
      ? file
      : new File([file], filename, { type: file.type || "application/octet-stream" });

  const buffer = await asFile.arrayBuffer();
  const validation = validateUpload(asFile, buffer);
  if (!validation.ok || !validation.mime) {
    throw new Error(validation.error ?? "Arquivo inválido.");
  }

  const ext = filename.split(".").pop()?.toLowerCase() || "bin";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("uploads").upload(path, buffer, {
    contentType: validation.mime,
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("uploads").getPublicUrl(path);
  return {
    publicUrl: data.publicUrl,
    path,
    mime: validation.mime,
    size: asFile.size,
  };
}
