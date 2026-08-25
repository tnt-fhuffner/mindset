"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Plus,
  Settings,
  Shield,
  UserRound,
  Users,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/use-social";
import { useProfile } from "@/hooks/use-profile";
import { createClient } from "@/lib/supabase/client";
import { cn, initials } from "@/lib/utils";

const NAV = [
  { href: "/maps", label: "Mapas", short: "Mapas", icon: LayoutGrid },
  { href: "/feed", label: "Timeline", short: "Feed", icon: BookOpen },
  { href: "/people", label: "Pessoas", short: "Pessoas", icon: Users },
  { href: "/messages", label: "Mensagens", short: "Chat", icon: MessageCircle },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: notifications } = useNotifications();
  const unread = (notifications ?? []).filter((item) => !item.read_at).length;
  const isMapEditor = pathname.startsWith("/maps/") && pathname !== "/maps/new";
  const fillViewport = isMapEditor || pathname === "/messages";

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <div className={cn("min-h-dvh bg-background", isMapEditor && "app-hide-tabbar")}>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r bg-card/80 px-4 py-5 backdrop-blur md:flex md:flex-col">
        <Link href="/maps" className="mb-8 px-2">
          <Logo />
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                  active && "bg-muted text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          {profile?.role === "admin" && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                pathname.startsWith("/admin") && "bg-muted text-foreground"
              )}
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          )}
        </nav>
        <Button asChild className="mt-4">
          <Link href="/maps/new">
            <Plus className="h-4 w-4" />
            Novo mapa
          </Link>
        </Button>
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex h-[var(--app-header)] items-center justify-between border-b bg-background/80 px-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur">
          <Link href="/maps" className="flex items-center gap-3 md:hidden" aria-label="MindSet">
            <Logo />
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/notifications" aria-label="Notificações" className="relative">
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
                )}
              </Link>
            </Button>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.display_name} />
                    <AvatarFallback>{initials(profile?.display_name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p>{profile?.display_name}</p>
                  <p className="text-xs font-normal text-muted-foreground">@{profile?.username}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={profile ? `/u/${profile.username}` : "/settings"}>
                    <UserRound className="mr-2 h-4 w-4" /> Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" /> Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main
          className={cn(
            fillViewport
              ? "h-[calc(100dvh-var(--app-header)-var(--app-tabbar))] overflow-hidden"
              : "min-h-[calc(100dvh-var(--app-header))] pb-[var(--app-tabbar)] md:pb-0"
          )}
        >
          {children}
        </main>
        {!isMapEditor && (
          <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t bg-background pb-[env(safe-area-inset-bottom,0px)] md:hidden">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-w-0 flex-col items-center gap-0.5 px-1 py-2 text-[10px] leading-tight text-muted-foreground",
                    active && "font-medium text-primary"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="max-w-full truncate">{item.short}</span>
                </Link>
              );
            })}
            <Link
              href="/feed/new"
              aria-current={pathname.startsWith("/feed/new") ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-center gap-0.5 px-1 py-2 text-[10px] leading-tight text-muted-foreground",
                pathname.startsWith("/feed/new") && "font-medium text-primary"
              )}
            >
              <Plus className="h-5 w-5" />
              <span className="max-w-full truncate">Novo</span>
            </Link>
          </nav>
        )}
      </div>
    </div>
  );
}
