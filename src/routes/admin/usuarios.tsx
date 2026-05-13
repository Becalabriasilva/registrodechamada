import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { RequireAdmin } from "@/components/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, ShieldOff, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/usuarios")({ component: Usuarios });

interface Row { id: string; full_name: string; matricula: string | null; turma: string | null; email: string | null; roles: string[] }

function Usuarios() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    const { data: profiles } = await supabase.from("profiles").select("id,full_name,matricula,turma,email").order("full_name");
    const { data: roles } = await supabase.from("user_roles").select("user_id,role");
    const map: Record<string, string[]> = {};
    for (const r of roles ?? []) (map[r.user_id] ??= []).push(r.role);
    setRows((profiles ?? []).map((p) => ({ ...p, roles: map[p.id] ?? [] })));
  }
  useEffect(() => { load(); }, []);

  async function toggleAdmin(id: string, isAdmin: boolean) {
    if (isAdmin) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", id).eq("role", "admin");
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: id, role: "admin" });
      if (error) return toast.error(error.message);
    }
    load();
  }

  async function removeUser(id: string) {
    if (!confirm("Excluir perfil? (a conta de auth permanecerá)")) return;
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  const filtered = rows.filter((r) =>
    !q || [r.full_name, r.matricula, r.turma, r.email].some((v) => v?.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <RequireAdmin>
      <AppShell mode="admin">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Usuários</h1>
            <p className="text-sm text-muted-foreground">Gestão de alunos, professores e administradores.</p>
          </div>
          <Input placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        </header>

        <Card>
          <CardHeader><CardTitle>{filtered.length} usuário(s)</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-muted-foreground">
                  <tr><th className="py-2">Nome</th><th>Matrícula</th><th>Turma</th><th>E-mail</th><th>Papéis</th><th></th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((r) => {
                    const isAdmin = r.roles.includes("admin");
                    return (
                      <tr key={r.id}>
                        <td className="py-2.5 font-medium">{r.full_name || "—"}</td>
                        <td>{r.matricula ?? "—"}</td>
                        <td>{r.turma ?? "—"}</td>
                        <td className="text-muted-foreground">{r.email ?? "—"}</td>
                        <td className="space-x-1">
                          {r.roles.map((rl) => <Badge key={rl} variant={rl === "admin" ? "default" : "secondary"} className="capitalize">{rl}</Badge>)}
                        </td>
                        <td className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => toggleAdmin(r.id, isAdmin)} className="gap-1">
                            {isAdmin ? <><ShieldOff className="h-3.5 w-3.5" /> Remover ADM</> : <><Shield className="h-3.5 w-3.5" /> Tornar ADM</>}
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => removeUser(r.id)}><Trash2 className="h-4 w-4" /></Button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Nenhum usuário.</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </AppShell>
    </RequireAdmin>
  );
}
