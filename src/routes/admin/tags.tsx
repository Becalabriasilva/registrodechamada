import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { RequireAdmin } from "@/components/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagScanPicker } from "@/components/tag-scan-picker";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/tags")({ component: Tags });

function Tags() {
  const [tags, setTags] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tagUid, setTagUid] = useState("");
  const [userId, setUserId] = useState<string>("");

  async function load() {
    const { data: t } = await supabase
      .from("tags")
      .select("*,profiles:profiles!tags_user_id_fkey(full_name,matricula)")
      .order("created_at", { ascending: false });
    setTags(t ?? []);
    const { data: u } = await supabase.from("profiles").select("id,full_name,matricula").order("full_name");
    setUsers(u ?? []);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("tags").insert({ tag_uid: tagUid, user_id: userId || null });
    if (error) return toast.error(error.message);
    toast.success("Tag cadastrada");
    setTagUid(""); setUserId(""); load();
  }
  async function remove(id: string) {
    if (!confirm("Excluir tag?")) return;
    const { error } = await supabase.from("tags").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <RequireAdmin>
      <AppShell mode="admin">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Tags RFID</h1>
          <p className="text-sm text-muted-foreground">Cadastre tags lidas pelo leitor e vincule a usuários.</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Cadastrar tag</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={add} className="space-y-3">
                <div>
                  <Label>UID da tag</Label>
                  <Input required value={tagUid} onChange={(e) => setTagUid(e.target.value)} placeholder="04:A3:B2:..." />
                </div>
                <div>
                  <Label>Aluno (opcional)</Label>
                  <Select value={userId} onValueChange={setUserId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name} {u.matricula ? `(${u.matricula})` : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="gap-2"><Plus className="h-4 w-4" />Adicionar</Button>
              </form>
            </CardContent>
          </Card>

          <TagScanPicker onPick={(uid) => { setTagUid(uid); toast.info(`UID ${uid} preenchido no formulário`); }} />
        </div>

        <Card className="mt-6">
          <CardHeader><CardTitle>{tags.length} tag(s)</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-muted-foreground">
                <tr><th className="py-2">UID</th><th>Aluno</th><th>Matrícula</th><th>Status</th><th></th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tags.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2.5 font-mono text-xs">{t.tag_uid}</td>
                    <td>{t.profiles?.full_name ?? "—"}</td>
                    <td>{t.profiles?.matricula ?? "—"}</td>
                    <td>{t.active ? "Ativa" : "Inativa"}</td>
                    <td className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
                {tags.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Nenhuma tag.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </AppShell>
    </RequireAdmin>
  );
}
