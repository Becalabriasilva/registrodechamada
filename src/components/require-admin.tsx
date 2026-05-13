import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { type ReactNode } from "react";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin, loading, user } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/login" }); return; }
    if (!isAdmin) { toast.error("Acesso restrito a administradores."); nav({ to: "/dashboard" }); }
  }, [loading, user, isAdmin, nav]);
  if (loading || !user || !isAdmin) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Verificando permissões...</div>;
  }
  return <>{children}</>;
}
