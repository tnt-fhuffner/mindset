import type { SupabaseClient } from "@supabase/supabase-js";
import { MASTER_ADMIN_EMAIL } from "@/lib/constants";

function baseUsername(email: string, displayName: string) {
  const fromEmail = email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
  const fromName = displayName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const base = (fromEmail || fromName || "user").slice(0, 20);
  return base.length ? base : "user";
}

function resolvedRole(email: string, requested?: "admin" | "user") {
  if (email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) return "admin" as const;
  return requested ?? ("user" as const);
}

export async function ensureProfile(
  admin: SupabaseClient,
  input: {
    id: string;
    email: string;
    displayName: string;
    role?: "admin" | "user";
    overwriteRole?: boolean;
  }
) {
  const { data: existing } = await admin
    .from("profiles")
    .select("id, username, role")
    .eq("id", input.id)
    .maybeSingle();

  if (existing) {
    const patch: Record<string, unknown> = {
      display_name: input.displayName,
      is_blocked: false,
    };
    if (input.overwriteRole || emailIsMaster(input.email)) {
      patch.role = resolvedRole(input.email, input.role);
    }
    await admin.from("profiles").update(patch).eq("id", input.id);
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
      role: resolvedRole(input.email, input.role),
      is_blocked: false,
    },
    { onConflict: "id" }
  );
  if (error) throw error;
}

function emailIsMaster(email: string) {
  return email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
}
