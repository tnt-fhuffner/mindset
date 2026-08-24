import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const FEATURES = [
  {
    title: "Editor visual",
    text: "Nós, conexões, cores e organogramas com arrastar e soltar. Exporte PNG, SVG, PDF ou JSON.",
  },
  {
    title: "IA com limite justo",
    text: "Gere a estrutura de um mapa a partir de um tema. O teto mensal vive no backend, não no cliente.",
  },
  {
    title: "Rede de conhecimento",
    text: "Publique PDFs, e-books, artigos e os próprios mapas. Curta, comente e baixe com rastreio.",
  },
  {
    title: "Privacidade por desenho",
    text: "Mapas privados, públicos ou só com link. RLS no Postgres e rotas admin protegidas.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" asChild>
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Começar</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-20 pt-8 lg:grid-cols-2">
        <div className="animate-fade-in">
          <p className="text-sm font-medium text-primary">Mapas + comunidade + IA limitada</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Organize ideias. Compartilhe o que importa.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            MindSet une um editor de mapas mentais na nuvem a uma timeline de conteúdo. Sem feed barulhento: conhecimento, arquivos e conversas com contexto.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/signup">Criar conta grátis</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Já tenho conta</Link>
            </Button>
          </div>
        </div>
        <HeroMap />
      </section>

      <section className="border-t bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="rounded-2xl border bg-background p-6">
              <h2 className="text-lg font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground">
        <Logo />
        <div className="flex gap-4">
          <Link href="/terms">Termos</Link>
          <Link href="/privacy">Privacidade</Link>
        </div>
      </footer>
    </div>
  );
}

function HeroMap() {
  return (
    <div className="relative overflow-hidden rounded-3xl border bg-card p-8 shadow-sm">
      <svg viewBox="0 0 420 280" className="h-full w-full">
        <line x1="210" y1="70" x2="90" y2="180" className="stroke-primary/40" strokeWidth="2" />
        <line x1="210" y1="70" x2="330" y2="180" className="stroke-primary/40" strokeWidth="2" />
        <line x1="90" y1="180" x2="50" y2="250" className="stroke-accent/40" strokeWidth="2" />
        <line x1="90" y1="180" x2="140" y2="250" className="stroke-accent/40" strokeWidth="2" />
        <line x1="330" y1="180" x2="290" y2="250" className="stroke-accent/40" strokeWidth="2" />
        <line x1="330" y1="180" x2="380" y2="250" className="stroke-accent/40" strokeWidth="2" />
        <circle cx="210" cy="70" r="28" className="fill-primary animate-pulse-node" />
        <circle cx="90" cy="180" r="20" className="fill-accent" />
        <circle cx="330" cy="180" r="20" className="fill-accent" />
        <circle cx="50" cy="250" r="12" className="fill-primary/70" />
        <circle cx="140" cy="250" r="12" className="fill-primary/70" />
        <circle cx="290" cy="250" r="12" className="fill-primary/70" />
        <circle cx="380" cy="250" r="12" className="fill-primary/70" />
      </svg>
      <p className="mt-2 text-center text-xs text-muted-foreground">Um mapa, várias ramificações, uma conta.</p>
    </div>
  );
}
