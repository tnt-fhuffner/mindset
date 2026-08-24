"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { getAppUrl, isSupabaseConfigured } from "@/lib/utils";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.9 2.2 2.7 6.4 2.7 11.5S6.9 20.8 12 20.8c6 0 9.3-4.2 9.3-9.1 0-.6 0-1-.1-1.5H12z" />
    </svg>
  );
}

const AUTH_ERRORS: Record<string, string> = {
  validation_failed: "Google ainda não está ligado neste projeto. Entre com e-mail e senha.",
  access_denied: "Google recusou o acesso. Entre com e-mail e senha.",
  otp_expired: "O link de e-mail expirou. Entre com senha.",
  blocked: "Esta conta foi bloqueada pela moderação.",
};

function friendlyAuthError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("rate") || lower.includes("too many") || lower.includes("over_email") || lower.includes("429")) {
    return "Muitas tentativas. Espere um pouco e use e-mail e senha.";
  }
  if (lower.includes("provider is not enabled") || lower.includes("unsupported provider") || lower.includes("validation_failed")) {
    return "Google ainda não está ligado. Crie a conta com e-mail e senha.";
  }
  if (lower.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (lower.includes("email not confirmed")) {
    return "Esta conta antiga ainda pede confirmação. Crie de novo não funciona — entre depois que o e-mail for confirmado no painel, ou use outra senha num e-mail novo.";
  }
  if (lower.includes("already") || lower.includes("já tem conta")) {
    return "Este e-mail já tem conta. Entre com a senha.";
  }
  if (lower.includes("supabase não configurado") || lower.includes("service_role")) return message;
  return message;
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const params = useSearchParams();
  const next = params.get("next") || "/maps";
  const queryError = params.get("error");
  const errorCode = params.get("error_code");
  const blocked = params.get("blocked") === "1";
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const configured = isSupabaseConfigured();
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH === "true";
  const banner =
    (!configured &&
      "As chaves do Supabase não foram compiladas neste deploy. Defina as variáveis na Vercel e faça Redeploy.") ||
    (blocked && AUTH_ERRORS.blocked) ||
    (errorCode && AUTH_ERRORS[errorCode]) ||
    (queryError && (AUTH_ERRORS[queryError] ?? decodeURIComponent(queryError.replace(/\+/g, " "))));

  function redirectTo() {
    return `${getAppUrl()}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  function goToApp() {
    window.location.assign(next.startsWith("/") ? next : "/maps");
  }

  async function withGoogle() {
    if (!configured) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectTo(),
          skipBrowserRedirect: true,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
      if (!data.url) throw new Error("Google não está habilitado no Supabase.");
      window.location.assign(data.url);
    } catch (error) {
      toast.error(error instanceof Error ? friendlyAuthError(error.message) : "Falha no Google.");
      setLoading(false);
    }
  }

  async function submit() {
    if (!configured) {
      toast.error("Supabase não configurado neste deploy.");
      return;
    }
    if (!email.trim() || password.length < 8) {
      toast.error("Informe um e-mail válido e uma senha com pelo menos 8 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();

      if (mode === "signup") {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            password,
            displayName: displayName.trim() || undefined,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.status === 409) {
          toast.error(payload.error ?? "Este e-mail já tem conta. Entre com a senha.");
          return;
        }
        if (!response.ok) throw new Error(payload.error ?? "Não foi possível criar a conta.");
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      goToApp();
    } catch (error) {
      toast.error(error instanceof Error ? friendlyAuthError(error.message) : "Não foi possível autenticar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {banner && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {banner}
        </p>
      )}
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="display-name">Nome</Label>
            <Input
              id="display-name"
              autoComplete="name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Como você quer aparecer"
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            placeholder="Mínimo 8 caracteres"
          />
        </div>
        <Button className="w-full" disabled={loading || !configured} type="submit">
          {loading ? "Aguarde…" : mode === "signup" ? "Criar conta e entrar" : "Entrar"}
        </Button>
      </form>
      {googleEnabled && (
        <>
          <div className="relative text-center text-xs text-muted-foreground">
            <span className="bg-card px-2 relative z-10">ou</span>
            <div className="absolute left-0 right-0 top-1/2 h-px bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={withGoogle} type="button" disabled={loading || !configured}>
            <GoogleIcon /> Continuar com Google
          </Button>
        </>
      )}
    </div>
  );
}
