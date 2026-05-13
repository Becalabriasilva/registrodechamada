import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/justificativas")({ component: Justificativas });

interface J { id: string; reason: string; start_date: string; end_date: string; status: string; file_path: string | null; created_at: string }

function Justificativas() {
  const { user } = useAuth();
  const [list, setList] = useState<J[]>([]);
  const [reason, setReason] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!user) return;
    const { data } = await supabase.from("justifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setList((data ?? []) as J[]);
  }
  useEffect(() => { load(); }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    let path: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop();
      const key = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("justifications").upload(key, file);
      if (upErr) { setLoading(false); return toast.error(upErr.message); }
      path = key;
    }
    const { error } = await supabase.from("justifications").insert({
      user_id: user.id, reason, start_date: start, end_date: end, file_path: path,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Justificativa enviada!");
    setReason(""); setStart(""); setEnd(""); setFile(null);
    load();
  }

  const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pendente: "secondary", aprovado: "default", rejeitado: "destructive",
  };

  return (
    <AppShell mode="student">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Justificativas</h1>
        <p className="text-sm text-muted-foreground">Envie atestados em PDF ou imagem para abonar faltas.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Nova justificativa</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Início</Label><Input type="date" required value={start} onChange={(e) => setStart(e.target.value)} /></div>
                <div><Label>Fim</Label><Input type="date" required value={end} onChange={(e) => setEnd(e.target.value)} /></div>
              </div>
              <div><Label>Motivo</Label><Textarea required value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} /></div>
              <div>
                <Label>Anexo (PDF/Imagem)</Label>
                <Input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
              <Button type="submit" disabled={loading} className="gap-2">
                <Upload className="h-4 w-4" /> {loading ? "Enviando..." : "Enviar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Minhas justificativas</CardTitle></CardHeader>
          <CardContent>
            {list.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma enviada ainda.</p>
            ) : (
              <ul className="divide-y divide-border">
                {list.map((j) => (
                  <li key={j.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">{new Date(j.start_date).toLocaleDateString("pt-BR")} → {new Date(j.end_date).toLocaleDateString("pt-BR")}</div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{j.reason}</p>
                      </div>
                      <Badge variant={statusVariant[j.status] ?? "outline"} className="capitalize">{j.status}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
