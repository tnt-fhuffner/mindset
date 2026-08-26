import { NextResponse } from "next/server";
import { emailConfigured, newMessageEmail, postPublishedEmail, sendEmails, type OutboundEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const FOLLOWER_CAP = 200;
const MESSAGE_DEBOUNCE_MS = 15 * 60 * 1000;

function isWebhook(request: Request) {
  const secret = process.env.NOTIFY_WEBHOOK_SECRET;
  if (!secret) return false;
  return request.headers.get("x-notify-secret") === secret;
}

async function emailsByUserId(ids: string[]) {
  const admin = createServiceClient();
  const unique = Array.from(new Set(ids)).slice(0, FOLLOWER_CAP);
  const found = new Map<string, string>();
  for (let index = 0; index < unique.length; index += 8) {
    const slice = unique.slice(index, index + 8);
    const rows = await Promise.all(
      slice.map(async (id) => {
        const { data, error } = await admin.auth.admin.getUserById(id);
        if (error || !data.user?.email) return null;
        return [id, data.user.email] as const;
      })
    );
    for (const row of rows) {
      if (row) found.set(row[0], row[1]);
    }
  }
  return found;
}

async function notifyPost(postId: string, authorId: string) {
  const admin = createServiceClient();
  const [{ data: post }, { data: author }, { data: follows }] = await Promise.all([
    admin.from("posts").select("id, title, author_id").eq("id", postId).maybeSingle(),
    admin.from("profiles").select("id, display_name").eq("id", authorId).maybeSingle(),
    admin.from("follows").select("follower_id").eq("following_id", authorId).limit(FOLLOWER_CAP),
  ]);
  if (!post || post.author_id !== authorId) return { sent: 0, total: 0 };

  const followerIds = ((follows ?? []) as { follower_id: string }[]).map((row) => row.follower_id);
  if (!followerIds.length) return { sent: 0, total: 0 };

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, is_blocked, notify_email_posts")
    .in("id", followerIds);

  const allowed = ((profiles ?? []) as { id: string; is_blocked: boolean; notify_email_posts?: boolean }[]).filter(
    (profile) => !profile.is_blocked && profile.notify_email_posts !== false
  );
  const emails = await emailsByUserId(allowed.map((profile) => profile.id));
  const actorName = author?.display_name ?? "Alguém";
  const outbound: OutboundEmail[] = [];
  emails.forEach((address) => {
    const template = postPublishedEmail({
      actorName,
      title: post.title,
      postId: post.id,
    });
    outbound.push({ ...template, to: address });
  });
  return sendEmails(outbound);
}

async function recentlyEmailedMessage(receiverId: string) {
  const admin = createServiceClient();
  const since = new Date(Date.now() - MESSAGE_DEBOUNCE_MS).toISOString();
  const { count } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", receiverId)
    .eq("type", "message")
    .gte("created_at", since);
  return (count ?? 0) > 1;
}

async function notifyMessage(input: { receiverId: string; senderId: string; preview: string }) {
  if (input.receiverId === input.senderId) return { sent: 0, total: 0 };
  const admin = createServiceClient();
  const { data: receiver } = await admin
    .from("profiles")
    .select("id, is_blocked, notify_email_messages")
    .eq("id", input.receiverId)
    .maybeSingle();
  if (!receiver || receiver.is_blocked || receiver.notify_email_messages === false) {
    return { sent: 0, total: 0 };
  }
  if (await recentlyEmailedMessage(input.receiverId)) {
    return { sent: 0, total: 0, skipped: "debounce" as const };
  }
  const { data: sender } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", input.senderId)
    .maybeSingle();
  const addresses = await emailsByUserId([input.receiverId]);
  const to = addresses.get(input.receiverId);
  if (!to) return { sent: 0, total: 0 };
  const template = newMessageEmail({
    actorName: sender?.display_name ?? "Alguém",
    preview: input.preview.slice(0, 180),
  });
  return sendEmails([{ ...template, to }]);
}

export async function POST(request: Request) {
  try {
    if (!emailConfigured()) {
      return NextResponse.json({ ok: true, skipped: "not_configured" });
    }

    const webhook = isWebhook(request);
    const supabase = await createClient();
    const {
      data: { user },
    } = webhook ? { data: { user: null } } : await supabase.auth.getUser();
    if (!webhook && !user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const limiterKey = webhook ? `notify:hook:${request.headers.get("x-forwarded-for") ?? "ip"}` : `notify:${user!.id}`;
    const limited = rateLimit(limiterKey, webhook ? 120 : 40, 60 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json({ error: "Muitos avisos. Tente mais tarde." }, { status: 429 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const record = (body.record ?? {}) as Record<string, string>;
    const table = String(body.table ?? "");
    const kind = String(body.kind ?? "");

    if (kind === "post" || table === "posts") {
      const postId = String(body.postId ?? record.id ?? "");
      const authorId = webhook ? String(record.author_id ?? "") : user!.id;
      if (!postId) return NextResponse.json({ error: "Post ausente." }, { status: 400 });
      if (!webhook) {
        const { data: post } = await supabase.from("posts").select("author_id").eq("id", postId).maybeSingle();
        if (!post || post.author_id !== user!.id) {
          return NextResponse.json({ error: "Post inválido." }, { status: 403 });
        }
      }
      const result = await notifyPost(postId, authorId || String(record.author_id ?? ""));
      return NextResponse.json({ ok: true, ...result });
    }

    if (kind === "message" || table === "messages") {
      const receiverId = String(body.receiverId ?? record.receiver_id ?? "");
      const senderId = webhook ? String(record.sender_id ?? "") : user!.id;
      const preview = String(body.preview ?? record.content ?? "");
      if (!receiverId) return NextResponse.json({ error: "Destinatário ausente." }, { status: 400 });
      if (!webhook && senderId !== user!.id) {
        return NextResponse.json({ error: "Mensagem inválida." }, { status: 403 });
      }
      const result = await notifyMessage({ receiverId, senderId, preview });
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: "Tipo de aviso inválido." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao enviar e-mail." },
      { status: 500 }
    );
  }
}
