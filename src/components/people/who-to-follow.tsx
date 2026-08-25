"use client";

import Link from "next/link";
import { PersonCard } from "@/components/people/person-card";
import { usePeople } from "@/hooks/use-people";

export function WhoToFollow({ limit = 5 }: { limit?: number }) {
  const people = usePeople("");
  const suggestions = (people.data?.profiles ?? [])
    .filter((profile) => !people.data?.followingIds.includes(profile.id))
    .slice(0, limit);

  if (!suggestions.length) return null;

  return (
    <section className="space-y-2 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Quem seguir</h2>
        <Link href="/people" className="text-xs text-primary underline">
          Ver todos
        </Link>
      </div>
      <div className="space-y-2">
        {suggestions.map((profile) => (
          <PersonCard key={profile.id} profile={profile} compact />
        ))}
      </div>
    </section>
  );
}
