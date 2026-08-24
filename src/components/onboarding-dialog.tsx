"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";

const STEPS = [
  {
    title: "Mapas mentais na nuvem",
    body: "Crie nós, conexões e organogramas. Tudo é salvo na sua conta e pode ser exportado em PNG, SVG, PDF ou JSON.",
  },
  {
    title: "Timeline de conhecimento",
    body: "Publique PDFs, artigos, links e os próprios mapas. Curta, comente e baixe conteúdos da comunidade.",
  },
  {
    title: "IA com limite justo",
    body: "O assistente gera estruturas a partir de um tema. Cada conta tem gerações grátis por mês para evitar abuso.",
  },
];

export function OnboardingDialog({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(!profile.onboarding_completed);
  const [step, setStep] = useState(0);
  const router = useRouter();

  async function finish() {
    const supabase = createClient();
    await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", profile.id);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{STEPS[step].title}</DialogTitle>
          <DialogDescription>{STEPS[step].body}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-between">
          <Button variant="ghost" onClick={finish}>
            Pular
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((value) => value + 1)}>Próximo</Button>
          ) : (
            <Button onClick={finish}>Começar</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
