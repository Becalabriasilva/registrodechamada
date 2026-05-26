import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { RequireAdmin } from "@/components/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { TagScanPicker } from "@/components/tag-scan-picker";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/tags")({ component: Tags });

interface RegistroRow { id: number; tag_uid: string; created_at: string; user_id: string | null }

function Tags() {
  const [tags, setTags] = useState<RegistroRow[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [tagUid, setTagUid] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  async function load() {
    const { data: t } = await supabase
      .from("registros_rfid")
      .select("id,tag_uid,created_at,user_id")
      .order("created_at", { ascending: false })
      .limit(500);
    const rows = (t ?? []) as RegistroRow[];
    setTags(rows);
    const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))) as string[];
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id,full_name").in("id", userIds);
      const map: Record<string, string> = {};
      for (const p of profs ?? []) map[p.id] = p.full_name;
      setUserMap(map);
    } else {
      setUserMap({});
    }
    setSelected(new Set());
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("registros_rfid-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "registros_rfid" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("registros_rfid").insert({ tag_uid: tagUid });
    if (error) return toast.error(error.message);
    toast.success("Tag registrada");
    setTagUid(""); load();
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === tags.length) setSelected(new Set());
    else setSelected(new Set(tags.map((t) => t.id)));
  }

  async function deleteOne(id: number) {
    if (!confirm("Excluir esta tag?")) return;
    const { error } = await supabase.from("registros_rfid").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Tag excluída");
    load();
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Excluir ${selected.size} tag(s) selecionada(s)?`)) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from("registros_rfid").delete().in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} tag(s) excluída(s)`);
    load();
  }

  return (
    <RequireAdmin>
      <AppShell mode="admin">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Tags RFID</h1>
          <p className="text-sm text-muted-foreground">Leituras do leitor físico em tempo real.</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Registrar tag manualmente</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={add} className="space-y-3">
                <div>
                  <Label>UID da tag</Label>
                  <Input required value={tagUid} onChange={(e) => setTagUid(e.target.value)} placeholder="04:A3:B2:..." />
                </div>
                <Button type="submit" className="gap-2"><Plus className="h-4 w-4" />Adicionar</Button>
              </form>
            </CardContent>
          </Card>

          <TagScanPicker onPick={(uid) => { setTagUid(uid); toast.info(`UID ${uid} preenchido no formulário`); }} />
        </div>

        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{tags.length} leitura(s) recente(s)</CardTitle>
            {selected.size > 0 && (
              <Button variant="destructive" size="sm" className="gap-2" onClick={deleteSelected}>
                <Trash2 className="h-4 w-4" /> Excluir selecionadas ({selected.size})
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-muted-foreground">
                <tr>
                  <th className="py-2 w-8">
                    <Checkbox
                      checked={tags.length > 0 && selected.size === tags.length}
                      onCheckedChange={toggleAll}
                    />
                  </th>
                  <th>UID</th>
                  <th>Vinculada a</th>
                  <th>Data/Hora</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tags.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2.5">
                      <Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggle(t.id)} />
                    </td>
                    <td className="font-mono text-xs">{t.tag_uid}</td>
                    <td>{t.user_id ? (userMap[t.user_id] ?? "—") : <span className="text-muted-foreground">não vinculada</span>}</td>
                    <td className="text-muted-foreground">{new Date(t.created_at).toLocaleString("pt-BR")}</td>
                    <td className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => deleteOne(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {tags.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Nenhuma leitura ainda.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </AppShell>
    </RequireAdmin>
  );
}
