"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProfile } from "@/hooks/use-profile";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const { data: profile, refetch } = useProfile();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const ready = Boolean(profile);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name);
    setUsername(profile.username);
    setBio(profile.bio ?? "");
  }, [profile]);

  async function save() {
    if (!profile) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, username, bio })
      .eq("id", profile.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Perfil atualizado.");
      refetch();
    }
  }

  async function uploadAvatar(file: File) {
    if (!profile) return;
    const supabase = createClient();
    const path = `${profile.id}/avatar-${Date.now()}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", profile.id);
    refetch();
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4 pb-24">
      <h1 className="text-2xl font-semibold">Configurações</h1>
      <div className="space-y-2">
        <Label>Nome</Label>
        <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} disabled={!ready} />
      </div>
      <div className="space-y-2">
        <Label>Usuário</Label>
        <Input value={username} onChange={(event) => setUsername(event.target.value)} disabled={!ready} />
      </div>
      <div className="space-y-2">
        <Label>Bio</Label>
        <Textarea value={bio} onChange={(event) => setBio(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Avatar</Label>
        <Input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && uploadAvatar(event.target.files[0])} />
      </div>
      <Button onClick={save}>Salvar</Button>
    </div>
  );
}
