import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { RequireAdmin } from "@/components/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, FileSpreadsheet } from "lucide-react";

export const Route = createFileRoute("/admin/relatorios")({ component: Relatorios });

interface Profile { id: string; full_name: string; matricula: string | null; turma: string | null }
interface Room { id: string; name: string }
interface Log {
  id: string; user_id: string; event_type: "entrada" | "saida"; occurred_at: string; room_id: string | null;
  profiles: Profile | null; rooms: Room | null;
}

function Relatorios() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [turmas, setTurmas] = useState<string[]>([]);

  const [userId, setUserId] = useState("");
  const [turma, setTurma] = useState("");
  const [roomId, setRoomId] = useState("");
  const [start, setStart] = useState(monthAgo);
  const [end, setEnd] = useState(today);

  const [rows, setRows] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,matricula,turma").order("full_name"),
        supabase.from("rooms").select("id,name").order("name"),
      ]);
      setProfiles((p ?? []) as Profile[]);
      setRooms((r ?? []) as Room[]);
      setTurmas(Array.from(new Set((p ?? []).map((x) => x.turma).filter(Boolean) as string[])).sort());
    })();
  }, []);

  async function run() {
    setLoading(true);
    let q = supabase
      .from("attendance_logs")
      .select("id,user_id,event_type,occurred_at,room_id,profiles:profiles!attendance_logs_user_id_fkey(id,full_name,matricula,turma),rooms:rooms!attendance_logs_room_id_fkey(id,name)")
      .gte("occurred_at", new Date(start + "T00:00:00").toISOString())
      .lte("occurred_at", new Date(end + "T23:59:59").toISOString())
      .order("occurred_at", { ascending: true })
      .limit(5000);

    if (userId) q = q.eq("user_id", userId);
    if (roomId) q = q.eq("room_id", roomId);

    const { data, error } = await q;
    setLoading(false);
    if (error) return toast.error(error.message);
    let res = (data ?? []) as unknown as Log[];
    if (turma) res = res.filter((l) => l.profiles?.turma === turma);
    setRows(res);
  }

  const totals = useMemo(() => {
    const byUser = new Map<string, { name: string; events: number; ms: number; lastIn: number | null }>();
    for (const l of rows) {
      const key = l.user_id;
      const entry = byUser.get(key) ?? { name: l.profiles?.full_name ?? "—", events: 0, ms: 0, lastIn: null as number | null };
      entry.events++;
      const t = +new Date(l.occurred_at);
      if (l.event_type === "entrada") entry.lastIn = t;
      else if (entry.lastIn) { entry.ms += t - entry.lastIn; entry.lastIn = null; }
      byUser.set(key, entry);
    }
    return Array.from(byUser.entries()).map(([uid, v]) => ({
      uid, name: v.name, events: v.events,
      hours: `${Math.floor(v.ms / 3600000)}h ${Math.floor((v.ms % 3600000) / 60000)}m`,
    }));
  }, [rows]);

  function exportCsv() {
    if (rows.length === 0) return toast.info("Nada para exportar.");
    const header = ["Data/Hora", "Aluno", "Matrícula", "Turma", "Sala", "Evento"];
    const lines = [header.join(",")];
    for (const l of rows) {
      const cells = [
        new Date(l.occurred_at).toLocaleString("pt-BR"),
        l.profiles?.full_name ?? "",
        l.profiles?.matricula ?? "",
        l.profiles?.turma ?? "",
        l.rooms?.name ?? "",
        l.event_type,
      ].map((c) => `"${String(c).replace(/"/g, '""')}"`);
      lines.push(cells.join(","));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_frequencia_${start}_a_${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <RequireAdmin>
      <AppShell mode="admin">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Filtre por aluno, turma, sala e período. Exporte em CSV.</p>
        </header>

        <Card className="mb-6">
          <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-5">
              <div>
                <Label>Aluno</Label>
                <Select value={userId} onValueChange={(v) => setUserId(v === "__all" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">Todos</SelectItem>
                    {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Turma</Label>
                <Select value={turma} onValueChange={(v) => setTurma(v === "__all" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">Todas</SelectItem>
                    {turmas.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sala</Label>
                <Select value={roomId} onValueChange={(v) => setRoomId(v === "__all" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">Todas</SelectItem>
                    {rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Início</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
              <div><Label>Fim</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={run} disabled={loading} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" /> {loading ? "Gerando..." : "Gerar relatório"}
              </Button>
              <Button variant="outline" onClick={exportCsv} className="gap-2">
                <Download className="h-4 w-4" /> Exportar CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle>Resumo por aluno</CardTitle></CardHeader>
            <CardContent>
              {totals.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Gere o relatório para ver o resumo.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-muted-foreground">
                    <tr><th className="py-2">Aluno</th><th>Eventos</th><th>Horas</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {totals.map((t) => (
                      <tr key={t.uid}><td className="py-2">{t.name}</td><td>{t.events}</td><td>{t.hours}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Eventos ({rows.length})</CardTitle></CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Sem dados.</p>
              ) : (
                <div className="max-h-[500px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card border-b border-border text-left text-muted-foreground">
                      <tr><th className="py-2">Data/Hora</th><th>Aluno</th><th>Turma</th><th>Sala</th><th>Evento</th></tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.map((l) => (
                        <tr key={l.id}>
                          <td className="py-2 whitespace-nowrap">{new Date(l.occurred_at).toLocaleString("pt-BR")}</td>
                          <td>{l.profiles?.full_name ?? "—"}</td>
                          <td>{l.profiles?.turma ?? "—"}</td>
                          <td>{l.rooms?.name ?? "—"}</td>
                          <td className="capitalize">{l.event_type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </RequireAdmin>
  );
}
