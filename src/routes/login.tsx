import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScanLine } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo!");
    nav({ to: "/dashboard" });
  }

  async function onReset(e: React.FormEvent) {
    e.preventDefault();
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/set-password`,
    });
    setResetLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Se o e-mail existir, enviaremos um link de recuperação.");
    setResetOpen(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ScanLine className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">FrequentarAgora</span>
        </Link>
        <h1 className="text-2xl font-semibold">Entrar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Acesse seu painel acadêmico.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              <Dialog open={resetOpen} onOpenChange={setResetOpen}>
                <DialogTrigger asChild>
                  <button type="button" className="text-xs text-primary hover:underline">Esqueci a senha</button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Recuperar senha</DialogTitle></DialogHeader>
                  <form onSubmit={onReset} className="space-y-4">
                    <div>
                      <Label htmlFor="resetEmail">E-mail cadastrado</Label>
                      <Input id="resetEmail" type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={resetLoading}>
                        {resetLoading ? "Enviando..." : "Enviar link"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          O cadastro de novos usuários é feito pelo administrador.
        </p>
      </div>
    </div>
  );
}
