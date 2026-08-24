import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureProfile } from "@/lib/ensure-profile";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role, is_blocked").eq("id", user.id).single();
  if (!profile || profile.role !== "admin" || profile.is_blocked) {
    return { error: NextResponse.json({ error: "Acesso negado." }, { status: 403 }) };
  }
  return { user };
}

const createUserSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
  displayName: z.string().trim().min(2).max(80),
  role: z.enum(["admin", "user"]).optional(),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const parsed = createUserSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Informe nome, e-mail válido e senha com pelo menos 8 caracteres." },
      { status: 400 }
    );
  }

  try {
    const admin = createServiceClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.displayName, name: parsed.data.displayName },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data.user) return NextResponse.json({ error: "Usuário não foi criado." }, { status: 400 });
    await ensureProfile(admin, {
      id: data.user.id,
      email: parsed.data.email,
      displayName: parsed.data.displayName,
      role: parsed.data.role ?? "user",
    });
    return NextResponse.json({ ok: true, userId: data.user.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao criar usuário." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const body = await request.json();
  const supabase = await createClient();

  if (body.action === "role" || body.action === "block") {
    const patch =
      body.action === "role" ? { role: body.role } : { is_blocked: Boolean(body.is_blocked) };
    const { error } = await supabase.from("profiles").update(patch).eq("id", body.userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "report") {
    const { error } = await supabase
      .from("reports")
      .update({ status: body.status, reviewed_at: new Date().toISOString(), reviewed_by: auth.user!.id })
      .eq("id", body.reportId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const body = await request.json();
  try {
    const admin = createServiceClient();
    if (body.targetType === "user" && body.userId) {
      const { error } = await admin.auth.admin.deleteUser(body.userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (body.targetType === "post" && body.postId) {
      const { error } = await admin.from("posts").delete().eq("id", body.postId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (body.targetType === "comment" && body.commentId) {
      const { error } = await admin.from("comments").delete().eq("id", body.commentId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha administrativa." },
      { status: 500 }
    );
  }
}
