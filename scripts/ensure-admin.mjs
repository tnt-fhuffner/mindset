import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const email = (process.argv[2] ?? process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL ?? "").toLowerCase();
const password = process.argv[3];

if (!email || !password) {
  console.error("Uso: node scripts/ensure-admin.mjs <email> <senha>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUser() {
  let page = 1;
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 200) return null;
    page += 1;
  }
  return null;
}

const existing = await findUser();
let user = existing;

if (user) {
  const { data, error } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
    user_metadata: { full_name: user.user_metadata?.full_name ?? "Felipe Huffner" },
  });
  if (error) throw error;
  user = data.user;
  console.log("Usuário atualizado e e-mail confirmado.");
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Felipe Huffner" },
  });
  if (error) throw error;
  user = data.user;
  console.log("Usuário criado com e-mail confirmado.");
}

const { error: profileError } = await admin.from("profiles").upsert(
  {
    id: user.id,
    display_name: user.user_metadata?.full_name ?? "Felipe Huffner",
    username: "felipeqh",
    role: "admin",
    is_blocked: false,
  },
  { onConflict: "id" }
);

if (profileError) {
  console.error("Auth ok, mas o perfil falhou. Rode a migration SQL no Supabase.");
  console.error(profileError.message);
  process.exit(1);
}

const { error: promoteError } = await admin.from("profiles").update({ role: "admin" }).eq("id", user.id);
if (promoteError) throw promoteError;

console.log(`Admin pronto: ${email} (role=admin)`);
