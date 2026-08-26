"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useProfile } from "@/hooks/use-profile";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const { data: profile, refetch } = useProfile();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [emailPosts, setEmailPosts] = useState(true);
  const [emailMessages, setEmailMessages] = useState(true);
  const ready = Boolean(profile);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name);
    setUsername(profile.username);
    setBio(profile.bio ?? "");
    setEmailPosts(profile.notify_email_posts !== false);
    setEmailMessages(profile.notify_email_messages !== false);
  }, [profile]);

  async function save() {
    if (!profile) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        username,
        bio,
        notify_email_posts: emailPosts,
        notify_email_messages: emailMessages,
      })
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
      <div className="space-y-3 rounded-xl border p-4">
        <p className="text-sm font-medium">E-mail</p>
        <label className="flex items-start justify-between gap-4 text-sm">
          <span>
            <span className="block font-medium">Novas publicações</span>
            <span className="text-muted-foreground">Quando alguém que você segue publica.</span>
          </span>
          <Switch checked={emailPosts} onCheckedChange={setEmailPosts} disabled={!ready} />
        </label>
        <label className="flex items-start justify-between gap-4 text-sm">
          <span>
            <span className="block font-medium">Mensagens</span>
            <span className="text-muted-foreground">Quando alguém te escreve no chat.</span>
          </span>
          <Switch checked={emailMessages} onCheckedChange={setEmailMessages} disabled={!ready} />
        </label>
      </div>
      <Button onClick={save}>Salvar</Button>
    </div>
  );
}
