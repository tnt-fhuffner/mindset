"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { POST_TYPES, type PostType } from "@/lib/constants";
import { useMindMaps } from "@/hooks/use-maps";
import { createClient } from "@/lib/supabase/client";
import { buildAndUploadThumbnail, insertPost, updatePost, uploadBlob } from "@/lib/posts";
import type { Post } from "@/types";

export function PostComposer({ post }: { post?: Post }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const maps = useMindMaps();
  const editing = Boolean(post);
  const [type, setType] = useState<PostType>(post?.type ?? "article");
  const [title, setTitle] = useState(post?.title ?? "");
  const [description, setDescription] = useState(post?.description ?? "");
  const [link, setLink] = useState(post?.link_url ?? "");
  const [mapId, setMapId] = useState<string>(post?.mind_map_id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!post) return;
    setType(post.type);
    setTitle(post.title);
    setDescription(post.description ?? "");
    setLink(post.link_url ?? "");
    setMapId(post.mind_map_id ?? "");
  }, [post]);

  async function submit() {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Faça login.");
      if (title.trim().length < 2) throw new Error("Dê um título para a publicação.");
      if (type === "link" && !link.trim()) throw new Error("Cole o link.");
      if (type === "map" && !mapId) throw new Error("Escolha um mapa.");
      if (["pdf", "ebook", "image"].includes(type) && !file && !post?.file_url) {
        throw new Error("Selecione um arquivo.");
      }

      let file_url: string | null = post?.file_url ?? null;
      let file_path: string | null = post?.file_path ?? null;
      let file_mime: string | null = post?.file_mime ?? null;
      let file_size: number | null = post?.file_size ?? null;

      if (file && ["pdf", "ebook", "image"].includes(type)) {
        const payload = await uploadBlob(file, file.name);
        file_url = payload.publicUrl;
        file_path = payload.path;
        file_mime = payload.mime;
        file_size = payload.size;
      }

      let thumbnail_url: string | null = post?.thumbnail_url ?? null;
      try {
        thumbnail_url = await buildAndUploadThumbnail({
          title,
          type,
          file,
          fileUrl: file_url,
          mapThumb: maps.data?.find((item) => item.id === mapId)?.thumbnail_url,
        });
      } catch {
        if (type === "image" && file_url) thumbnail_url = file_url;
      }

      const row = {
        type,
        title: title.trim(),
        description: description.trim() || null,
        link_url: type === "link" ? link.trim() : null,
        mind_map_id: type === "map" ? mapId : null,
        file_url,
        file_path,
        file_mime,
        file_size,
        thumbnail_url,
      };

      if (editing && post) {
        const { error } = await updatePost(post.id, row);
        if (error) throw error;
        toast.success("Publicação atualizada.");
        router.push(`/feed/${post.id}`);
      } else {
        const { error } = await insertPost({ ...row, author_id: user.id });
        if (error) throw error;
        toast.success("Publicação criada.");
        router.push("/feed");
      }
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível publicar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4 pb-24">
      <h1 className="text-2xl font-semibold">{editing ? "Editar publicação" : "Nova publicação"}</h1>
      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select value={type} onValueChange={(value) => setType(value as PostType)} disabled={editing}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {POST_TYPES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Título</Label>
        <Input value={title} onChange={(event) => setTitle(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
      </div>
      {type === "link" && (
        <div className="space-y-2">
          <Label>URL</Label>
          <Input value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://" />
        </div>
      )}
      {type === "map" && (
        <div className="space-y-2">
          <Label>Mapa</Label>
          <Select value={mapId} onValueChange={setMapId}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha um mapa" />
            </SelectTrigger>
            <SelectContent>
              {(maps.data ?? []).map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {["pdf", "ebook", "image"].includes(type) && (
        <div className="space-y-2">
          <Label>Arquivo</Label>
          <Input
            type="file"
            accept={
              type === "image"
                ? "image/png,image/jpeg,image/gif,image/webp"
                : type === "ebook"
                  ? ".pdf,.epub,application/pdf,application/epub+zip"
                  : "application/pdf,.pdf"
            }
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-muted-foreground">
            {editing && post?.file_url
              ? "Pode trocar o arquivo ou deixar o atual. PDF, EPUB ou imagens até 10 MB."
              : "PDF, EPUB ou imagens até 10 MB."}
          </p>
        </div>
      )}
      <Button disabled={loading || title.trim().length < 2} onClick={() => void submit()}>
        {loading ? "Salvando…" : editing ? "Salvar" : "Publicar"}
      </Button>
    </div>
  );
}
