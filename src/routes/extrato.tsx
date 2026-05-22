import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/extrato")({ component: Extrato });

interface Log { room_id: string | null; event_type: "entrada" | "saida"; occurred_at: string }
interface Room { id: string; name: string; start_time: string | null; cutoff_time: string | null; end_time: string | null; days_of_week: number[] }

type Status = "presente" | "atrasado" | "ausente";

function toMin(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }

function buildSessions(rooms: Room[], days = 14) {
  const out: { date: Date; room: Room }[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const dow = d.getDay();
    for (const r of rooms) {
      if (!r.start_time || !r.cutoff_time) continue;
      if (!r.days_of_week?.includes(dow)) continue;
      out.push({ date: d, room: r });
    }
  }
  return out;
}

function computeStatus(date: Date, room: Room, logs: Log[]): Status {
  const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);
  const cutoffMin = toMin(room.cutoff_time!);
  const endMin = room.end_time ? toMin(room.end_time) : 24 * 60;
  const entries = logs.filter((l) =>
    l.event_type === "entrada" && l.room_id === room.id &&
    new Date(l.occurred_at) >= dayStart && new Date(l.occurred_at) <= dayEnd,
  );
  if (entries.length === 0) return "ausente";
  const first = entries.reduce((a, b) => new Date(a.occurred_at) < new Date(b.occurred_at) ? a : b);
  const t = new Date(first.occurred_at);
  const min = t.getHours() * 60 + t.getMinutes();
  if (min <= cutoffMin) return "presente";
  if (min <= endMin) return "atrasado";
  return "ausente";
}

function Extrato() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const since = new Date(); since.setDate(since.getDate() - 30);
      const [{ data: l }, { data: r }] = await Promise.all([
        supabase.from("attendance_logs").select("room_id,event_type,occurred_at")
          .eq("user_id", user.id).gte("occurred_at", since.toISOString()).order("occurred_at", { ascending: false }),
        supabase.from("rooms").select("id,name,start_time,cutoff_time,end_time,days_of_week"),
      ]);
      setLogs((l ?? []) as Log[]);
      setRooms((r ?? []) as Room[]);
    })();
  }, [user]);

  const sessions = buildSessions(rooms, 14);
  const enriched = sessions.map((s) => ({ ...s, status: computeStatus(s.date, s.room, logs) }));
  const counts = enriched.reduce(
    (acc, e) => ({ ...acc, [e.status]: acc[e.status] + 1 }),
    { presente: 0, atrasado: 0, ausente: 0 } as Record<Status, number>,
  );

  return (
    <AppShell mode="student">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Extrato</h1>
        <p className="text-sm text-muted-foreground">Frequência por sessão de sala. Após o horário limite, a falta é registrada.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card><CardContent className="p-6"><div className="text-xs uppercase text-muted-foreground">Presenças</div><div className="text-3xl font-semibold text-emerald-600">{counts.presente}</div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-xs uppercase text-muted-foreground">Atrasos</div><div className="text-3xl font-semibold text-amber-600">{counts.atrasado}</div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-xs uppercase text-muted-foreground">Faltas</div><div className="text-3xl font-semibold text-destructive">{counts.ausente}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Últimos 14 dias</CardTitle></CardHeader>
        <CardContent>
          {enriched.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma sala com horário definido ainda.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-muted-foreground">
                <tr><th className="py-2">Dia</th><th>Sala</th><th>Horário</th><th>Status</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {enriched.map((e, i) => (
                  <tr key={i}>
                    <td className="py-2.5">{e.date.toLocaleDateString("pt-BR")}</td>
                    <td>{e.room.name}</td>
                    <td className="text-muted-foreground">{e.room.start_time?.slice(0, 5)} – {e.room.end_time?.slice(0, 5)} (até {e.room.cutoff_time?.slice(0, 5)})</td>
                    <td>
                      {e.status === "presente" && <Badge className="bg-emerald-600">Presente</Badge>}
                      {e.status === "atrasado" && <Badge className="bg-amber-600">Atrasado</Badge>}
                      {e.status === "ausente" && <Badge variant="destructive">Falta</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
