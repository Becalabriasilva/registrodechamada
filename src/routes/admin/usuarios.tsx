import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { createUserInvite, updateUserTag, updateUser } from "@/lib/users.functions";
import { AppShell } from "@/components/app-shell";
import { RequireAdmin } from "@/components/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagScanPicker } from "@/components/tag-scan-picker";
import { toast } from "sonner";
import { Shield, ShieldOff, Trash2, UserPlus, Tag as TagIcon, Copy, Pencil } from "lucide-react";

export const Route = createFileRoute("/admin/usuarios")({ component: Usuarios });

interface Row { id: string; full_name: string; matricula: string | null; turma: string | null; cpf?: string | null; email: string | null; roles: string[]; tag_uid: string | null }

function Usuarios() {
  const [rows, setRows] = useState<Row[]>([]);
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [q, setQ] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [updateUid, setUpdateUid] = useState<{ id: string; name: string } | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);

  const createFn = useServerFn(createUserInvite);
  const updateTagFn = useServerFn(updateUserTag);
  const updateUserFn = useServerFn(updateUser);

  async function load() {
    const { data: profiles } = await supabase.from("profiles").select("id,full_name,matricula,turma,cpf,email").order("full_name");
    const { data: roles } = await supabase.from("user_roles").select("user_id,role");
    const { data: tags } = await supabase.from("tags").select("user_id,tag_uid").eq("active", true);
    const { data: rs } = await supabase.from("rooms").select("id,name").order("name");
    setRooms(rs ?? []);
    const rmap: Record<string, string[]> = {};
    for (const r of roles ?? []) (rmap[r.user_id] ??= []).push(r.role);
    const tmap: Record<string, string> = {};
    for (const t of tags ?? []) if (t.user_id) tmap[t.user_id] = t.tag_uid;
    setRows((profiles ?? []).map((p) => ({ ...p, roles: rmap[p.id] ?? [], tag_uid: tmap[p.id] ?? null })));
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
          <div className="flex items-center gap-2">
            <Input placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
              <DialogTrigger asChild>
                <Button className="gap-2"><UserPlus className="h-4 w-4" /> Novo usuário</Button>
              </DialogTrigger>
              <CreateUserDialog
                rooms={rooms}
                onClose={() => { setOpenCreate(false); load(); }}
                createFn={createFn}
              />
            </Dialog>
          </div>
        </header>

        <Card>
          <CardHeader><CardTitle>{filtered.length} usuário(s)</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-muted-foreground">
                  <tr><th className="py-2">Nome</th><th>Matrícula</th><th>Turma</th><th>E-mail</th><th>Papéis</th><th>Tag</th><th></th></tr>
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
                        <td>
                          {r.tag_uid ? <span className="font-mono text-xs">{r.tag_uid}</span> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="text-right whitespace-nowrap">
                          <Button size="sm" variant="ghost" onClick={() => setEditing(r)} className="gap-1">
                            <Pencil className="h-3.5 w-3.5" /> Editar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setUpdateUid({ id: r.id, name: r.full_name })} className="gap-1">
                            <TagIcon className="h-3.5 w-3.5" /> Tag
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => toggleAdmin(r.id, isAdmin)} className="gap-1">
                            {isAdmin ? <><ShieldOff className="h-3.5 w-3.5" /> Remover ADM</> : <><Shield className="h-3.5 w-3.5" /> Tornar ADM</>}
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => removeUser(r.id)}><Trash2 className="h-4 w-4" /></Button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Nenhum usuário.</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Dialog: atualizar/substituir tag */}
        <Dialog open={!!updateUid} onOpenChange={(o) => !o && setUpdateUid(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Atualizar tag — {updateUid?.name}</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              Aproxime a nova tag do leitor e clique em "Usar". A tag anterior será desvinculada.
            </p>
            <TagScanPicker
              onPick={async (uid) => {
                if (!updateUid) return;
                try {
                  await updateTagFn({ data: { user_id: updateUid.id, tag_uid: uid } });
                  toast.success("Tag atualizada");
                  setUpdateUid(null);
                  load();
                } catch (e: any) { toast.error(e.message); }
              }}
            />
          </DialogContent>
        </Dialog>
      </AppShell>
    </RequireAdmin>
  );
}

function CreateUserDialog({
  rooms, onClose, createFn,
}: {
  rooms: { id: string; name: string }[];
  onClose: () => void;
  createFn: ReturnType<typeof useServerFn<typeof createUserInvite>>;
}) {
  const [form, setForm] = useState({
    email: "", full_name: "", matricula: "", cpf: "", turma: "",
    role: "aluno" as "aluno" | "professor" | "admin",
    tag_uid: "",
    prof_turma: "", prof_room_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [actionLink, setActionLink] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await createFn({
        data: {
          email: form.email,
          full_name: form.full_name,
          matricula: form.matricula || null,
          cpf: form.cpf || null,
          turma: form.turma || null,
          role: form.role,
          tag_uid: form.tag_uid || null,
          prof_turma: form.role === "professor" ? (form.prof_turma || null) : null,
          prof_room_id: form.role === "professor" ? (form.prof_room_id || null) : null,
          redirectTo: `${window.location.origin}/set-password`,
        },
      });
      toast.success("Usuário criado. Envie o link de definição de senha para o usuário.");
      setActionLink(res.action_link);
    } catch (e: any) {
      toast.error(e.message || "Falha ao criar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>Novo usuário</DialogTitle></DialogHeader>

      {actionLink ? (
        <div className="space-y-4">
          <p className="text-sm">Usuário criado. Compartilhe o link abaixo para que defina a senha:</p>
          <div className="flex gap-2">
            <Input readOnly value={actionLink} />
            <Button type="button" variant="outline" className="gap-1" onClick={() => { navigator.clipboard.writeText(actionLink!); toast.success("Copiado"); }}>
              <Copy className="h-3.5 w-3.5" /> Copiar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Um e-mail de recuperação também foi enviado automaticamente para {form.email}.
          </p>
          <DialogFooter>
            <Button onClick={onClose}>Concluir</Button>
          </DialogFooter>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome completo *</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>E-mail *</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Matrícula</Label><Input value={form.matricula} onChange={(e) => setForm({ ...form, matricula: e.target.value })} /></div>
            <div><Label>CPF</Label><Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></div>
            <div><Label>Turma</Label><Input value={form.turma} onChange={(e) => setForm({ ...form, turma: e.target.value })} /></div>
            <div>
              <Label>Papel *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aluno">Aluno</SelectItem>
                  <SelectItem value="professor">Professor</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.role === "professor" && (
            <div className="grid grid-cols-2 gap-3 rounded-md border border-dashed border-border p-3">
              <div className="col-span-2 text-xs text-muted-foreground">Escopo do professor — preencha turma <strong>ou</strong> sala (uma das duas).</div>
              <div><Label>Turma atendida</Label><Input value={form.prof_turma} onChange={(e) => setForm({ ...form, prof_turma: e.target.value })} /></div>
              <div>
                <Label>Sala atendida</Label>
                <Select value={form.prof_room_id} onValueChange={(v) => setForm({ ...form, prof_room_id: v })}>
                  <SelectTrigger><SelectValue placeholder="(opcional)" /></SelectTrigger>
                  <SelectContent>
                    {rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div>
            <Label>Tag RFID (opcional)</Label>
            <Input
              placeholder="Selecione abaixo ou digite o UID"
              value={form.tag_uid}
              onChange={(e) => setForm({ ...form, tag_uid: e.target.value })}
            />
            <div className="mt-2">
              <TagScanPicker onPick={(uid) => setForm({ ...form, tag_uid: uid })} />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? "Criando..." : "Criar e enviar convite"}</Button>
          </DialogFooter>
        </form>
      )}
    </DialogContent>
  );
}
