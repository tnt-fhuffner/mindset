"use client";

import { useEffect, useState } from "react";
import { Search, Users } from "lucide-react";
import { PersonCard } from "@/components/people/person-card";
import { Input } from "@/components/ui/input";
import { usePeople } from "@/hooks/use-people";

export default function PeoplePage() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearch(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const people = usePeople(search);
  const profiles = people.data?.profiles ?? [];
  const searching = search.length > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 pb-24">
      <div>
        <h1 className="text-2xl font-semibold">Descobrir pessoas</h1>
        <p className="text-sm text-muted-foreground">Busque por nome ou @usuario e siga quem quiser acompanhar na timeline.</p>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar nome ou usuário"
          className="pl-9"
        />
      </div>
      {people.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {people.isError && <p className="text-sm text-destructive">Não foi possível carregar as pessoas.</p>}
      {!people.isLoading && profiles.length === 0 && (
        <div className="rounded-xl border p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            {searching ? "Ninguém encontrado com esse nome." : "Ainda não há outras pessoas no app."}
          </p>
        </div>
      )}
      {profiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{searching ? "Resultados" : "Sugestões para seguir"}</p>
          {profiles.map((profile) => (
            <PersonCard key={profile.id} profile={profile} />
          ))}
        </div>
      )}
    </div>
  );
}
