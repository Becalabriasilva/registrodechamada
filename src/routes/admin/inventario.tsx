import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { RequireAdmin } from "@/components/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/inventario")({ component: Inventario });

function Inventario() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", category: "", quantity: 0, min_quantity: 0, location: "" });

  async function load() {
    const { data } = await supabase.from("inventory").select("*").order("name");
    setItems(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("inventory").insert(form);
    if (error) return toast.error(error.message);
    toast.success("Item adicionado");
    setForm({ name: "", category: "", quantity: 0, min_quantity: 0, location: "" });
    load();
  }
  async function updateQty(id: string, qty: number) {
    const { error } = await supabase.from("inventory").update({ quantity: qty }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }
  async function remove(id: string) {
    if (!confirm("Excluir item?")) return;
    const { error } = await supabase.from("inventory").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <RequireAdmin>
      <AppShell mode="admin">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Inventário</h1>
          <p className="text-sm text-muted-foreground">Estoque de insumos da instituição.</p>
        </header>

        <Card className="mb-6">
          <CardHeader><CardTitle>Novo item</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={add} className="grid gap-3 md:grid-cols-5">
              <div className="md:col-span-2"><Label>Nome</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Categoria</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              <div><Label>Qtd.</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} /></div>
              <div><Label>Mínimo</Label><Input type="number" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: +e.target.value })} /></div>
              <div className="md:col-span-4"><Label>Localização</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <Button type="submit" className="gap-2 self-end"><Plus className="h-4 w-4" />Adicionar</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{items.length} item(ns)</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-muted-foreground">
                <tr><th className="py-2">Nome</th><th>Categoria</th><th>Local</th><th>Quantidade</th><th>Status</th><th></th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((i) => {
                  const low = i.quantity <= i.min_quantity;
                  return (
                    <tr key={i.id}>
                      <td className="py-2.5 font-medium">{i.name}</td>
                      <td>{i.category ?? "—"}</td>
                      <td>{i.location ?? "—"}</td>
                      <td>
                        <Input type="number" defaultValue={i.quantity} className="w-24" onBlur={(e) => { const v = +e.target.value; if (v !== i.quantity) updateQty(i.id, v); }} />
                      </td>
                      <td>{low ? <Badge variant="destructive">Baixo</Badge> : <Badge variant="secondary">OK</Badge>}</td>
                      <td className="text-right"><Button size="icon" variant="ghost" onClick={() => remove(i.id)}><Trash2 className="h-4 w-4" /></Button></td>
                    </tr>
                  );
                })}
                {items.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Nenhum item.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </AppShell>
    </RequireAdmin>
  );
}
