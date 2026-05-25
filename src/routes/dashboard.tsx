import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, XCircle, LogIn, LogOut, Tag } from "lucide-react";

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
      const [{ data: p }, { data: l }] = await Promise.all([
        supabase.from("profiles").select("full_name,matricula,turma").eq("id", user.id).maybeSingle(),
        supabase.from("attendance_logs").select("*").eq("user_id", user.id).order("occurred_at", { ascending: false }).limit(20),
      ]);
      setProfile(p as Profile | null);
      setLogs((l ?? []) as LogRow[]);
      setTag(null);
    })();

    const ch = supabase.channel("logs-self")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "attendance_logs", filter: `user_id=eq.${user.id}` },
        (payload) => setLogs((prev) => [payload.new as LogRow, ...prev]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const last = logs[0];
  const isPresent = last?.event_type === "entrada";
  const hasAny = !!last;

  const today = new Date().toDateString();
  const todayLogs = logs.filter((l) => new Date(l.occurred_at).toDateString() === today);

  return (
    <AppShell mode="student">
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">Olá, {profile?.full_name || "aluno"}</p>
        <h1 className="text-3xl font-semibold tracking-tight">Painel de presença</h1>
        <p className="text-sm text-muted-foreground">Matrícula {profile?.matricula ?? "—"} · Turma {profile?.turma ?? "—"}</p>
      </header>

      {/* Cartão grande de situação atual */}
      <Card
        className={
          "mb-6 overflow-hidden border-2 " +
          (isPresent ? "border-emerald-500/40 bg-emerald-50/60" : hasAny ? "border-amber-500/40 bg-amber-50/60" : "border-border bg-card")
        }
      >
        <CardContent className="flex flex-wrap items-center justify-between gap-6 p-8">
          <div className="flex items-center gap-5">
            <div
              className={
                "flex h-16 w-16 items-center justify-center rounded-full " +
                (isPresent ? "bg-emerald-500 text-white" : hasAny ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground")
              }
            >
              {isPresent ? <CheckCircle2 className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Situação atual</div>
              <div className="text-3xl font-bold">
                {isPresent ? "Presente" : hasAny ? "Ausente" : "Sem registros"}
              </div>
              <div className="text-sm text-muted-foreground">
                {hasAny ? `Última leitura: ${new Date(last.occurred_at).toLocaleString("pt-BR")}` : "Nenhuma leitura ainda"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={Activity} label="Eventos hoje" value={String(todayLogs.length)} />
        <StatCard icon={Tag} label="Tag RFID" value={tag ?? "Não vinculada"} muted={!tag} />
        <StatCard icon={LogIn} label="Total registros" value={String(logs.length)} />
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
                  <Badge variant="outline">{l.event_type === "entrada" ? "Entrada" : "Saída"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

function StatCard({ icon: Icon, label, value, muted }: { icon: any; label: string; value: string; muted?: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className={"flex h-11 w-11 items-center justify-center rounded-md " + (muted ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}>
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
