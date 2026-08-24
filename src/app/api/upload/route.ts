import { NextResponse } from "next/server";
import { validateUpload } from "@/lib/file-validation";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const limited = rateLimit(`upload:${user.id}`, 20, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Limite de uploads atingido. Tente mais tarde." }, { status: 429 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo ausente." }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const validation = validateUpload(file, buffer);
  if (!validation.ok || !validation.mime) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("uploads").upload(path, buffer, {
    contentType: validation.mime,
    upsert: false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data } = supabase.storage.from("uploads").getPublicUrl(path);
  return NextResponse.json({
    path,
    publicUrl: data.publicUrl,
    mime: validation.mime,
    size: file.size,
  });
}
