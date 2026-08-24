import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/admin";

const signupSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
  displayName: z.string().trim().min(2).max(80).optional(),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limited = rateLimit(`signup:${ip}`, 8, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Muitas contas criadas deste endereço. Espere alguns minutos." },
      { status: 429 }
    );
  }

  const parsed = signupSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Informe um e-mail válido e uma senha com pelo menos 8 caracteres." },
      { status: 400 }
    );
  }

  const { email, password, displayName } = parsed.data;
  const name = displayName || email.split("@")[0];

  try {
    const admin = createServiceClient();
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, name },
    });

    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes("already") || message.includes("registered") || message.includes("exists")) {
        return NextResponse.json(
          { error: "Este e-mail já tem conta. Entre com a senha." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível criar a conta. Confira SUPABASE_SERVICE_ROLE_KEY na Vercel.",
      },
      { status: 500 }
    );
  }
}
