import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { RequireAdmin } from "@/components/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagScanPicker } from "@/components/tag-scan-picker";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/admin/tags")({ component: Tags });

function Tags() {
  const [tags, setTags] = useState<any[]>([]);
  const [tagUid, setTagUid] = useState("");

  async function load() {
    const { data: t } = await supabase
      .from("registros_rfid")
      .select("id,tag_uid,created_at")
      .order("created_at", { ascending: false });
    setTags(t ?? []);
  }
  useEffect(() => {
    load();
    const ch = supabase
      .channel("registros_rfid-list")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "registros_rfid" }, () => load())
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
          <CardHeader><CardTitle>{tags.length} leitura(s) recente(s)</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-muted-foreground">
                <tr><th className="py-2">UID</th><th>Data/Hora</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tags.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2.5 font-mono text-xs">{t.tag_uid}</td>
                    <td className="text-muted-foreground">{new Date(t.created_at).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
                {tags.length === 0 && <tr><td colSpan={2} className="py-8 text-center text-muted-foreground">Nenhuma leitura ainda.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </AppShell>
    </RequireAdmin>
  );
}
