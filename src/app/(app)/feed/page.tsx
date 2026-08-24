"use client";

import Link from "next/link";
import { useState } from "react";
import { PostCard } from "@/components/feed/post-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFeed } from "@/hooks/use-feed";

export default function FeedPage() {
  const [mode, setMode] = useState<"all" | "following">("all");
  const feed = useFeed(mode);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Timeline</h1>
        <Button asChild>
          <Link href="/feed/new">Publicar</Link>
        </Button>
      </div>
      <Tabs value={mode} onValueChange={(value) => setMode(value as "all" | "following")}>
        <TabsList>
          <TabsTrigger value="all">Para você</TabsTrigger>
          <TabsTrigger value="following">Seguindo</TabsTrigger>
        </TabsList>
      </Tabs>
      {(feed.data ?? []).map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {feed.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">Nada por aqui ainda. Publique um PDF, um artigo ou um mapa.</p>
      )}
    </div>
  );
}
