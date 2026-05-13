import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, LogIn, LogOut, Tag } from "lucide-react";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

interface LogRow { id: string; event_type: "entrada" | "saida"; occurred_at: string; room_id: string | null }
interface Profile { full_name: string; matricula: string | null; turma: string | null }

function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [tag, setTag] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: l }, { data: t }] = await Promise.all([
        supabase.from("profiles").select("full_name,matricula,turma").eq("id", user.id).maybeSingle(),
        supabase.from("attendance_logs").select("*").eq("user_id", user.id).order("occurred_at", { ascending: false }).limit(20),
        supabase.from("tags").select("tag_uid").eq("user_id", user.id).maybeSingle(),
      ]);
      setProfile(p as Profile | null);
      setLogs((l ?? []) as LogRow[]);
      setTag(t?.tag_uid ?? null);
    })();

    const ch = supabase.channel("logs-self")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "attendance_logs", filter: `user_id=eq.${user.id}` },
        (payload) => setLogs((prev) => [payload.new as LogRow, ...prev]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const last = logs[0];
  const status = last?.event_type === "entrada" ? "Presente" : last?.event_type === "saida" ? "Ausente" : "Sem registros";

  const today = new Date().toDateString();
  const todayLogs = logs.filter((l) => new Date(l.occurred_at).toDateString() === today);

  return (
    <AppShell mode="student">
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">Olá, {profile?.full_name || "aluno"}</p>
        <h1 className="text-3xl font-semibold tracking-tight">Painel de presença</h1>
        <p className="text-sm text-muted-foreground">Matrícula {profile?.matricula ?? "—"} · Turma {profile?.turma ?? "—"}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={Activity} label="Status atual" value={status}
          accent={last?.event_type === "entrada" ? "ok" : last?.event_type === "saida" ? "warn" : "muted"} />
        <StatCard icon={Tag} label="Tag RFID" value={tag ?? "Não vinculada"} accent={tag ? "ok" : "muted"} />
        <StatCard icon={LogIn} label="Eventos hoje" value={String(todayLogs.length)} accent="muted" />
      </div>

      <Card className="mt-8">
        <CardHeader><CardTitle>Histórico recente</CardTitle></CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma leitura registrada ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {logs.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    {l.event_type === "entrada" ? <LogIn className="h-4 w-4 text-emerald-600" /> : <LogOut className="h-4 w-4 text-amber-600" />}
                    <div>
                      <div className="text-sm font-medium capitalize">{l.event_type}</div>
                      <div className="text-xs text-muted-foreground">{new Date(l.occurred_at).toLocaleString("pt-BR")}</div>
                    </div>
                  </div>
                  <Badge variant="outline">{l.event_type === "entrada" ? "Presente" : "Saída"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: "ok" | "warn" | "muted" }) {
  const color =
    accent === "ok" ? "bg-emerald-500/10 text-emerald-700" :
    accent === "warn" ? "bg-amber-500/10 text-amber-700" :
    "bg-secondary text-secondary-foreground";
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`flex h-11 w-11 items-center justify-center rounded-md ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs uppercase text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
