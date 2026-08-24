"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { getAppUrl } from "@/lib/utils";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.9 2.2 2.7 6.4 2.7 11.5S6.9 20.8 12 20.8c6 0 9.3-4.2 9.3-9.1 0-.6 0-1-.1-1.5H12z" />
    </svg>
  );
}

const AUTH_ERRORS: Record<string, string> = {
  auth: "Não foi possível concluir o login. Use e-mail e senha.",
  access_denied: "Acesso negado pelo provedor.",
  otp_expired: "O link de e-mail expirou. Entre com senha ou peça um novo link.",
  blocked: "Esta conta foi bloqueada pela moderação.",
};

function friendlyAuthError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (lower.includes("email not confirmed")) return "Confirme o e-mail antes de entrar, ou use a senha após a confirmação automática do admin.";
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return "Este e-mail já tem conta. Entre na aba Entrar.";
  }
  if (lower.includes("expired")) return "O link expirou. Entre com e-mail e senha.";
  return message;
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const params = useSearchParams();
  const next = params.get("next") || "/maps";
  const queryError = params.get("error");
  const errorCode = params.get("error_code");
  const blocked = params.get("blocked") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const redirectTo = `${getAppUrl()}/auth/callback?next=${encodeURIComponent(next)}`;
  const banner =
    (blocked && AUTH_ERRORS.blocked) ||
    (errorCode && AUTH_ERRORS[errorCode]) ||
    (queryError && (AUTH_ERRORS[queryError] ?? decodeURIComponent(queryError)));

  function goToApp() {
    window.location.assign(next.startsWith("/") ? next : "/maps");
  }

  async function withGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) toast.error(friendlyAuthError(error.message));
  }

  async function withPassword(type: "login" | "signup") {
    if (!email.trim() || password.length < 8) {
      toast.error("Informe e-mail válido e senha com pelo menos 8 caracteres.");
      return;
    }
    setLoading(true);
    try {
      if (type === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;
        if (data.session) {
          goToApp();
          return;
        }
        toast.success("Conta criada. Se o Supabase pedir confirmação, use o link do e-mail ou entre com a senha.");
        return;
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

  async function withMagicLink() {
    if (!email.trim()) {
      toast.error("Informe o e-mail para receber o link.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      toast.success("Link mágico enviado. Confira sua caixa de entrada.");
    } catch (error) {
      toast.error(error instanceof Error ? friendlyAuthError(error.message) : "Não foi possível enviar o link.");
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
      <Button variant="outline" className="w-full" onClick={withGoogle} type="button">
        <GoogleIcon /> Continuar com Google
      </Button>
      <div className="relative text-center text-xs text-muted-foreground">
        <span className="bg-card px-2 relative z-10">ou e-mail e senha</span>
        <div className="absolute left-0 right-0 top-1/2 h-px bg-border" />
      </div>
      <Tabs defaultValue={mode}>
        <TabsList className="w-full">
          <TabsTrigger className="flex-1" value="login">
            Entrar
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="signup">
            Criar conta
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="magic">
            Link mágico
          </TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void withPassword("login");
            }}
          >
            <Field email={email} password={password} setEmail={setEmail} setPassword={setPassword} />
            <Button className="w-full" disabled={loading} type="submit">
              {loading ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        </TabsContent>
        <TabsContent value="signup">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void withPassword("signup");
            }}
          >
            <Field email={email} password={password} setEmail={setEmail} setPassword={setPassword} />
            <Button className="w-full" disabled={loading} type="submit">
              {loading ? "Criando…" : "Criar conta"}
            </Button>
          </form>
        </TabsContent>
        <TabsContent value="magic" className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="magic-email">E-mail</Label>
            <Input id="magic-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button className="w-full" disabled={loading || !email} onClick={withMagicLink}>
            Enviar link
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({
  email,
  password,
  setEmail,
  setPassword,
}: {
  email: string;
  password: string;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>
    </>
  );
}
