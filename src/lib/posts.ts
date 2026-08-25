import { validateUpload } from "@/lib/file-validation";
import { makePostThumbnail } from "@/lib/post-thumbnail";
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

export async function updatePost(id: string, row: Record<string, unknown>) {
  const supabase = createClient();
  const first = await supabase.from("posts").update(row).eq("id", id);
  if (!first.error) return first;
  if (first.error.message.toLowerCase().includes("thumbnail")) {
    const rest = { ...row };
    delete rest.thumbnail_url;
    return supabase.from("posts").update(rest).eq("id", id);
  }
  return first;
}

export async function deletePost(id: string) {
  const supabase = createClient();
  return supabase.from("posts").delete().eq("id", id);
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

export async function buildAndUploadThumbnail(input: {
  title: string;
  type: string;
  file?: File | null;
  fileUrl?: string | null;
  mapThumb?: string | null;
}) {
  if (input.type === "image" && input.fileUrl && !input.file) return input.fileUrl;
  if (input.type === "map" && input.mapThumb) return input.mapThumb;

  const cover = await makePostThumbnail({ title: input.title, type: input.type, file: input.file });
  if (input.type === "image" && input.fileUrl && input.file && cover === input.file) {
    return input.fileUrl;
  }
  const mime = cover.type || "image/jpeg";
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const coverFile = new File([cover], `cover.${ext}`, { type: mime });
  const thumb = await uploadBlob(coverFile, coverFile.name);
  return thumb.publicUrl;
}
