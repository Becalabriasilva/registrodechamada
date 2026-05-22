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
import { Plus, Trash2, Clock } from "lucide-react";

export const Route = createFileRoute("/admin/salas")({ component: Salas });

const DAYS = [
  { v: 0, l: "Dom" }, { v: 1, l: "Seg" }, { v: 2, l: "Ter" },
  { v: 3, l: "Qua" }, { v: 4, l: "Qui" }, { v: 5, l: "Sex" }, { v: 6, l: "Sáb" },
];

function Salas() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [presence, setPresence] = useState<Record<string, any[]>>({});
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(30);
  const [startTime, setStartTime] = useState("08:00");
  const [cutoffTime, setCutoffTime] = useState("08:15");
  const [endTime, setEndTime] = useState("12:00");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);

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
      if (!l.room_id || !l.user_id) continue;
      byRoom[l.room_id] ??= new Map();
      if (l.event_type === "entrada") byRoom[l.room_id].set(l.user_id, l);
      else byRoom[l.room_id].delete(l.user_id);
    }
    const result: Record<string, any[]> = {};
    for (const k in byRoom) result[k] = Array.from(byRoom[k].values());
    setPresence(result);
  }
  useEffect(() => { load(); }, []);

  function toggleDay(d: number) {
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("rooms").insert({
      name, capacity,
      start_time: startTime || null,
      cutoff_time: cutoffTime || null,
      end_time: endTime || null,
      days_of_week: days,
    });
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
          <p className="text-sm text-muted-foreground">Defina horário de início, prazo para registrar presença e término.</p>
        </header>

        <Card className="mb-6">
          <CardHeader><CardTitle>Nova sala</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={add} className="grid gap-3 md:grid-cols-2">
              <div><Label>Nome</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>Capacidade</Label><Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(+e.target.value)} /></div>
              <div><Label>Início</Label><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
              <div><Label>Prazo para presença (limite)</Label><Input type="time" value={cutoffTime} onChange={(e) => setCutoffTime(e.target.value)} /></div>
              <div><Label>Término</Label><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
              <div>
                <Label>Dias da semana</Label>
                <div className="flex flex-wrap gap-1 pt-2">
                  {DAYS.map((d) => (
                    <button
                      type="button"
                      key={d.v}
                      onClick={() => toggleDay(d.v)}
                      className={
                        "rounded-md border px-3 py-1.5 text-xs " +
                        (days.includes(d.v) ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")
                      }
                    >
                      {d.l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <Button type="submit" className="gap-2"><Plus className="h-4 w-4" />Adicionar sala</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {rooms.map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>{r.name}</CardTitle>
                <Button variant="ghost" size="icon" aria-label="Excluir sala" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent>
                <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {r.start_time ? `${r.start_time.slice(0, 5)} → ${r.end_time?.slice(0, 5) ?? "?"} · presença até ${r.cutoff_time?.slice(0, 5) ?? "—"}` : "Sem horário definido"}
                </div>
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
