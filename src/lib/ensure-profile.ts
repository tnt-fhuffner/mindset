import type { SupabaseClient } from "@supabase/supabase-js";

function baseUsername(email: string, displayName: string) {
  const fromEmail = email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
  const fromName = displayName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const base = fromEmail.length >= 3 ? fromEmail : fromName || "user";
  return base.slice(0, 20);
}

export async function ensureProfile(
  admin: SupabaseClient,
  input: { id: string; email: string; displayName: string; role?: "admin" | "user" }
) {
  const { data: existing } = await admin.from("profiles").select("id, username").eq("id", input.id).maybeSingle();
  if (existing) {
    await admin
      .from("profiles")
      .update({
        display_name: input.displayName,
        role: input.role ?? "user",
        is_blocked: false,
      })
      .eq("id", input.id);
    return;
  }

  let username = baseUsername(input.email, input.displayName);
  let suffix = 0;
  for (;;) {
    const candidate = suffix === 0 ? username : `${username}${suffix}`;
    const { data } = await admin.from("profiles").select("id").eq("username", candidate).maybeSingle();
    if (!data) {
      username = candidate;
      break;
    }
    suffix += 1;
  }

  const { error } = await admin.from("profiles").upsert(
    {
      id: input.id,
      display_name: input.displayName,
      username,
      role: input.role ?? "user",
      is_blocked: false,
    },
    { onConflict: "id" }
  );
  if (error) throw error;
}
