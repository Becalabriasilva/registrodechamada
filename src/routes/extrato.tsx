import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/extrato")({ component: Extrato });

interface Log { event_type: "entrada" | "saida"; occurred_at: string }

function groupByDay(logs: Log[]) {
  const days = new Map<string, Log[]>();
  for (const l of logs) {
    const d = new Date(l.occurred_at).toLocaleDateString("pt-BR");
    if (!days.has(d)) days.set(d, []);
    days.get(d)!.push(l);
  }
  return Array.from(days.entries()).map(([day, items]) => {
    items.sort((a, b) => +new Date(a.occurred_at) - +new Date(b.occurred_at));
    let totalMs = 0;
    let lastIn: number | null = null;
    for (const i of items) {
      if (i.event_type === "entrada") lastIn = +new Date(i.occurred_at);
      else if (lastIn) { totalMs += +new Date(i.occurred_at) - lastIn; lastIn = null; }
    }
    const hours = Math.floor(totalMs / 3600000);
    const mins = Math.floor((totalMs % 3600000) / 60000);
    return { day, count: items.length, hours: `${hours}h ${mins}m` };
  });
}

function Extrato() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("attendance_logs").select("event_type,occurred_at").eq("user_id", user.id).order("occurred_at", { ascending: false }).limit(500)
      .then(({ data }) => setLogs((data ?? []) as Log[]));
  }, [user]);

  const days = groupByDay(logs);
  const totalDays = days.length;
  const totalEvents = logs.length;

  return (
    <AppShell mode="student">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Extrato</h1>
        <p className="text-sm text-muted-foreground">Relatório individual de horas e dias frequentados.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card><CardContent className="p-6"><div className="text-xs uppercase text-muted-foreground">Dias com presença</div><div className="text-3xl font-semibold">{totalDays}</div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-xs uppercase text-muted-foreground">Total de eventos</div><div className="text-3xl font-semibold">{totalEvents}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Frequência por dia</CardTitle></CardHeader>
        <CardContent>
          {days.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem dados ainda.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-muted-foreground">
                <tr><th className="py-2">Dia</th><th>Eventos</th><th>Tempo na instituição</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {days.map((d) => (
                  <tr key={d.day}><td className="py-2.5">{d.day}</td><td>{d.count}</td><td>{d.hours}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
