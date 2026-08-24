import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { Logo } from "@/components/logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Link href="/" className="mb-2 inline-flex">
            <Logo />
          </Link>
          <CardTitle>Criar sua conta</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense>
            <AuthForm mode="signup" />
          </Suspense>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Já tem conta? <Link href="/login" className="text-primary underline">Entrar</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
