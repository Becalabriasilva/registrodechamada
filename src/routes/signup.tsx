import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScanLine } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({ component: Signup });

function Signup() {
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", full_name: "", matricula: "", cpf: "", turma: "" });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: form.full_name,
          matricula: form.matricula,
          cpf: form.cpf,
          turma: form.turma,
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Verifique seu e-mail.");
    nav({ to: "/login" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ScanLine className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">FrequênciaTAG</span>
        </Link>
        <h1 className="text-2xl font-semibold">Criar conta de aluno</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <div><Label>Nome completo</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Matrícula</Label><Input required value={form.matricula} onChange={(e) => setForm({ ...form, matricula: e.target.value })} /></div>
            <div><Label>CPF</Label><Input required value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></div>
          </div>
          <div><Label>Turma</Label><Input value={form.turma} onChange={(e) => setForm({ ...form, turma: e.target.value })} /></div>
          <div><Label>E-mail</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Senha</Label><Input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Criando..." : "Criar conta"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Já tem conta? <Link to="/login" className="text-primary hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
