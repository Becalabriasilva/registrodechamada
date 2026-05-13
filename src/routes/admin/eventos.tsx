import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { RequireAdmin } from "@/components/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";

export const Route = createFileRoute("/admin/eventos")({ component: Eventos });

function Eventos() {
  const [logs, setLogs] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load() {
    let query = supabase.from("attendance_logs")
      .select("id,event_type,occurred_at,room_id,user_id,profiles:profiles!attendance_logs_user_id_fkey(full_name,matricula,turma),rooms(name)")
      .order("occurred_at", { ascending: false }).limit(500);
    if (from) query = query.gte("occurred_at", new Date(from).toISOString());
    if (to) { const d = new Date(to); d.setHours(23, 59, 59); query = query.lte("occurred_at", d.toISOString()); }
    const { data } = await query;
    setLogs(data ?? []);
  }
  useEffect(() => { load(); }, [from, to]);

  const filtered = logs.filter((l) =>
    !q || [l.profiles?.full_name, l.profiles?.matricula, l.profiles?.turma, l.rooms?.name].some((v: string) => v?.toLowerCase().includes(q.toLowerCase())),
  );

  function exportCsv() {
    const headers = ["Data", "Aluno", "Matrícula", "Turma", "Sala", "Evento"];
    const rows = filtered.map((l) => [
      new Date(l.occurred_at).toLocaleString("pt-BR"),
      l.profiles?.full_name ?? "",
      l.profiles?.matricula ?? "",
      l.profiles?.turma ?? "",
      l.rooms?.name ?? "",
      l.event_type,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `eventos-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <RequireAdmin>
      <AppShell mode="admin">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Eventos</h1>
            <p className="text-sm text-muted-foreground">Histórico de leituras com filtros.</p>
          </div>
          <Button onClick={exportCsv} className="gap-2"><Download className="h-4 w-4" /> Exportar CSV</Button>
        </header>

        <Card className="mb-6">
          <CardContent className="grid gap-3 p-6 md:grid-cols-3">
            <div><label className="text-xs text-muted-foreground">Buscar</label><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Aluno, turma, sala..." /></div>
            <div><label className="text-xs text-muted-foreground">De</label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground">Até</label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{filtered.length} evento(s)</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-muted-foreground">
                  <tr><th className="py-2">Data/Hora</th><th>Aluno</th><th>Matrícula</th><th>Turma</th><th>Sala</th><th>Evento</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((l) => (
                    <tr key={l.id}>
                      <td className="py-2.5">{new Date(l.occurred_at).toLocaleString("pt-BR")}</td>
                      <td className="font-medium">{l.profiles?.full_name ?? "—"}</td>
                      <td>{l.profiles?.matricula ?? "—"}</td>
                      <td>{l.profiles?.turma ?? "—"}</td>
                      <td>{l.rooms?.name ?? "—"}</td>
                      <td className="capitalize">{l.event_type}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Nenhum evento.</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </AppShell>
    </RequireAdmin>
  );
}
