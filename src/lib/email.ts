import { getAppUrl } from "@/lib/utils";

const RESEND_URL = "https://api.resend.com/emails";
const MAX_BATCH = 8;

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fromAddress() {
  return process.env.EMAIL_FROM?.trim() || "MindSet <beth.t@example.com>";
}

function layout(title: string, body: string, href: string, cta: string) {
  const app = escapeHtml(getAppUrl());
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#f6f4f1;font-family:Georgia,serif;color:#1f2937;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;background:#ffffff;border:1px solid #e7e0d8;border-radius:16px;">
            <tr>
              <td style="padding:28px 32px 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#5b4cdb;">MindSet</td>
            </tr>
            <tr>
              <td style="padding:0 32px 12px;font-size:22px;font-weight:600;line-height:1.3;">${title}</td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px;font-size:15px;line-height:1.6;color:#4b5563;">${body}</td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <a href="${href}" style="display:inline-block;background:#5b4cdb;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;">${cta}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px;font-size:12px;color:#9ca3af;">
                <a href="${app}/settings" style="color:#6b7280;">Gerenciar e-mails</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export type OutboundEmail = {
  to: string;
  subject: string;
  html: string;
};

export function postPublishedEmail(input: {
  actorName: string;
  title: string;
  postId: string;
}): OutboundEmail {
  const href = `${getAppUrl()}/feed/${input.postId}`;
  return {
    to: "",
    subject: `${input.actorName} publicou no MindSet: ${input.title}`,
    html: layout(
      escapeHtml(input.actorName) + " publicou algo novo",
      `${escapeHtml(input.actorName)} acabou de publicar <strong>${escapeHtml(input.title)}</strong>.`,
      href,
      "Ver publicação"
    ),
  };
}

export function newMessageEmail(input: { actorName: string; preview: string }): OutboundEmail {
  const href = `${getAppUrl()}/messages`;
  const preview = input.preview.trim() || "Nova mensagem";
  return {
    to: "",
    subject: `${input.actorName} enviou uma mensagem no MindSet`,
    html: layout(
      escapeHtml(input.actorName) + " enviou uma mensagem",
      `<em>${escapeHtml(preview)}</em>`,
      href,
      "Abrir conversa"
    ),
  };
}

async function sendOne(email: OutboundEmail) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false as const, error: "missing_key" };
  const response = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [email.to],
      subject: email.subject,
      html: email.html,
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return { ok: false as const, error: text.slice(0, 200) || `HTTP ${response.status}` };
  }
  return { ok: true as const };
}

export async function sendEmails(emails: OutboundEmail[]) {
  let sent = 0;
  for (let index = 0; index < emails.length; index += MAX_BATCH) {
    const slice = emails.slice(index, index + MAX_BATCH);
    const results = await Promise.all(slice.map(sendOne));
    sent += results.filter((item) => item.ok).length;
  }
  return { sent, total: emails.length };
}
