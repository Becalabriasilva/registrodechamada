import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { RequireAdmin } from "@/components/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/salas")({ component: Salas });

function Salas() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [presence, setPresence] = useState<Record<string, any[]>>({});
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(30);

  async function load() {
    const { data: rs } = await supabase.from("rooms").select("*").order("name");
    setRooms(rs ?? []);
    const since = new Date(); since.setHours(0, 0, 0, 0);
    const { data: logs } = await supabase
      .from("attendance_logs")
      .select("room_id,user_id,event_type,occurred_at,profiles:profiles!attendance_logs_user_id_fkey(full_name)")
      .gte("occurred_at", since.toISOString())
      .order("occurred_at", { ascending: true });
    const byRoom: Record<string, Map<string, any>> = {};
    for (const l of logs ?? []) {
      if (!l.room_id) continue;
      byRoom[l.room_id] ??= new Map();
      if (l.event_type === "entrada") byRoom[l.room_id].set(l.user_id, l);
      else byRoom[l.room_id].delete(l.user_id);
    }
    const result: Record<string, any[]> = {};
    for (const k in byRoom) result[k] = Array.from(byRoom[k].values());
    setPresence(result);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("rooms").insert({ name, capacity });
    if (error) return toast.error(error.message);
    toast.success("Sala criada");
    setName(""); setCapacity(30); load();
  }
  async function remove(id: string) {
    if (!confirm("Excluir sala?")) return;
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <RequireAdmin>
      <AppShell mode="admin">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Salas</h1>
          <p className="text-sm text-muted-foreground">Quem está presente em cada sala neste momento.</p>
        </header>

        <Card className="mb-6">
          <CardHeader><CardTitle>Nova sala</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={add} className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]"><Label>Nome</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="w-32"><Label>Capacidade</Label><Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(+e.target.value)} /></div>
              <Button type="submit" className="gap-2"><Plus className="h-4 w-4" />Adicionar</Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {rooms.map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>{r.name}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent>
                <div className="mb-3 text-sm text-muted-foreground">
                  Presentes: <span className="font-semibold text-foreground">{presence[r.id]?.length ?? 0}</span> / {r.capacity}
                </div>
                <ul className="space-y-1 text-sm">
                  {(presence[r.id] ?? []).map((p, i) => (
                    <li key={i} className="rounded bg-secondary px-2 py-1">{p.profiles?.full_name ?? "Aluno"}</li>
                  ))}
                  {(!presence[r.id] || presence[r.id].length === 0) && <li className="text-muted-foreground">Nenhum aluno presente.</li>}
                </ul>
              </CardContent>
            </Card>
          ))}
          {rooms.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma sala cadastrada.</p>}
        </div>
      </AppShell>
    </RequireAdmin>
  );
}
