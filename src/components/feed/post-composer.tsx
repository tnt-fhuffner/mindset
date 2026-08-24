"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { POST_TYPES } from "@/lib/constants";
import { useMindMaps } from "@/hooks/use-maps";
import { createClient } from "@/lib/supabase/client";
import { makePostThumbnail } from "@/lib/post-thumbnail";
import { insertPost, uploadBlob } from "@/lib/posts";

export function PostComposer() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const maps = useMindMaps();
  const [type, setType] = useState("article");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [mapId, setMapId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Faça login.");

      let file_url: string | null = null;
      let file_path: string | null = null;
      let file_mime: string | null = null;
      let file_size: number | null = null;

      if (file && ["pdf", "ebook", "image"].includes(type)) {
        const payload = await uploadBlob(file, file.name);
        file_url = payload.publicUrl;
        file_path = payload.path;
        file_mime = payload.mime;
        file_size = payload.size;
      }

      let thumbnail_url: string | null = null;
      if (type === "image" && file_url) {
        thumbnail_url = file_url;
      } else if (type === "map") {
        thumbnail_url = maps.data?.find((item) => item.id === mapId)?.thumbnail_url ?? null;
      }
      if (!thumbnail_url) {
        try {
          const cover = await makePostThumbnail({ title, type, file });
          const mime = cover.type || "image/jpeg";
          const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
          const coverFile = new File([cover], `cover.${ext}`, { type: mime });
          const thumb = await uploadBlob(coverFile, coverFile.name);
          thumbnail_url = thumb.publicUrl;
        } catch {
          thumbnail_url = null;
        }
      }

      const { error } = await insertPost({
        author_id: user.id,
        type,
        title,
        description,
        link_url: type === "link" ? link : null,
        mind_map_id: type === "map" ? mapId : null,
        file_url,
        file_path,
        file_mime,
        file_size,
        thumbnail_url,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      toast.success("Publicação criada.");
      router.push("/feed");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível publicar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Nova publicação</h1>
      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select value={type} onValueChange={setType}>
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
          <Input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          <p className="text-xs text-muted-foreground">PDF, EPUB ou imagens até 10 MB.</p>
        </div>
      )}
      <Button disabled={loading || title.length < 3} onClick={submit}>
        Publicar
      </Button>
    </div>
  );
}
