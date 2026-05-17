import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { RequireAdmin } from "@/components/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DoorOpen, Tag, FileCheck } from "lucide-react";

export const Route = createFileRoute("/admin/")({ component: AdminHome });

function AdminHome() {
  const [stats, setStats] = useState({ users: 0, rooms: 0, tags: 0, pending: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [u, r, t, j, logs] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("rooms").select("id", { count: "exact", head: true }),
        supabase.from("tags").select("id", { count: "exact", head: true }),
        supabase.from("justifications").select("id", { count: "exact", head: true }).eq("status", "pendente"),
        supabase.from("attendance_logs").select("id,event_type,occurred_at,user_id,profiles:profiles!attendance_logs_user_id_fkey(full_name)").order("occurred_at", { ascending: false }).limit(10),
      ]);
      setStats({ users: u.count ?? 0, rooms: r.count ?? 0, tags: t.count ?? 0, pending: j.count ?? 0 });
      setRecent(logs.data ?? []);
    })();
  }, []);

  return (
    <RequireAdmin>
      <AppShell mode="admin">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Painel administrativo</h1>
          <p className="text-sm text-muted-foreground">Visão geral do sistema.</p>
        </header>
        <div className="grid gap-4 md:grid-cols-4">
          <Stat icon={Users} label="Usuários" value={stats.users} />
          <Stat icon={DoorOpen} label="Salas" value={stats.rooms} />
          <Stat icon={Tag} label="Tags RFID" value={stats.tags} />
          <Link to="/admin/justificativas" className="block">
            <Card className={stats.pending > 0 ? "border-destructive/40" : ""}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={"flex h-11 w-11 items-center justify-center rounded-md " + (stats.pending > 0 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
                  <FileCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Justificativas pendentes</div>
                  <div className="text-2xl font-semibold">{stats.pending}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <Card className="mt-8">
          <CardHeader><CardTitle>Últimas leituras</CardTitle></CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum evento ainda.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <div className="font-medium">{r.profiles?.full_name ?? "Aluno"}</div>
                      <div className="text-xs text-muted-foreground">{new Date(r.occurred_at).toLocaleString("pt-BR")}</div>
                    </div>
                    <span className="capitalize text-muted-foreground">{r.event_type}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </AppShell>
    </RequireAdmin>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs uppercase text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
