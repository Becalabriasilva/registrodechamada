import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { RequireAdmin } from "@/components/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Check, X, Download } from "lucide-react";

export const Route = createFileRoute("/admin/justificativas")({ component: AdminJust });

interface J {
  id: string; user_id: string; reason: string; start_date: string; end_date: string;
  status: "pendente" | "aprovado" | "rejeitado"; file_path: string | null; created_at: string;
  reviewed_at: string | null; reviewed_by: string | null;
  profiles?: { full_name: string; matricula: string | null; turma: string | null } | null;
}

function AdminJust() {
  const { user } = useAuth();
  const [list, setList] = useState<J[]>([]);
  const [tab, setTab] = useState("pendente");

  async function load() {
    const { data } = await supabase
      .from("justifications")
      .select("*,profiles:profiles!justifications_user_id_fkey(full_name,matricula,turma)")
      .order("created_at", { ascending: false });
    setList((data ?? []) as J[]);
  }
  useEffect(() => { load(); }, []);

  async function review(id: string, status: "aprovado" | "rejeitado") {
    const { error } = await supabase
      .from("justifications")
      .update({ status, reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "aprovado" ? "Justificativa aprovada — falta anulada." : "Justificativa rejeitada.");
    load();
  }

  async function openAttachment(path: string) {
    const { data } = await supabase.storage.from("justifications").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  const filtered = list.filter((j) => j.status === tab);
  const pendingCount = list.filter((j) => j.status === "pendente").length;

  return (
    <RequireAdmin>
      <AppShell mode="admin">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Justificativas</h1>
          <p className="text-sm text-muted-foreground">
            Aprove ou rejeite atestados. Apenas justificativas <strong>aprovadas</strong> anulam a falta.
          </p>
        </header>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="pendente">Pendentes {pendingCount > 0 && <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-[10px]">{pendingCount}</Badge>}</TabsTrigger>
            <TabsTrigger value="aprovado">Aprovadas</TabsTrigger>
            <TabsTrigger value="rejeitado">Rejeitadas</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            <Card>
              <CardHeader><CardTitle>{filtered.length} registro(s)</CardTitle></CardHeader>
              <CardContent>
                {filtered.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nenhum registro.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {filtered.map((j) => (
                      <li key={j.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{j.profiles?.full_name ?? "Aluno"}</span>
                            <span className="text-xs text-muted-foreground">
                              {j.profiles?.matricula && `mat. ${j.profiles.matricula} · `}
                              {j.profiles?.turma && `turma ${j.profiles.turma}`}
                            </span>
                          </div>
                          <div className="mt-1 text-sm">
                            {new Date(j.start_date).toLocaleDateString("pt-BR")} → {new Date(j.end_date).toLocaleDateString("pt-BR")}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{j.reason}</p>
                          {j.file_path && (
                            <Button size="sm" variant="link" className="h-6 gap-1 p-0" onClick={() => openAttachment(j.file_path!)}>
                              <Download className="h-3 w-3" /> Ver anexo
                            </Button>
                          )}
                        </div>
                        {j.status === "pendente" ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => review(j.id, "aprovado")} className="gap-1">
                              <Check className="h-4 w-4" /> Aprovar
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => review(j.id, "rejeitado")} className="gap-1">
                              <X className="h-4 w-4" /> Rejeitar
                            </Button>
                          </div>
                        ) : (
                          <div className="text-right text-xs text-muted-foreground">
                            <Badge variant={j.status === "aprovado" ? "default" : "destructive"} className="capitalize">{j.status}</Badge>
                            {j.reviewed_at && <div className="mt-1">em {new Date(j.reviewed_at).toLocaleString("pt-BR")}</div>}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </AppShell>
    </RequireAdmin>
  );
}
