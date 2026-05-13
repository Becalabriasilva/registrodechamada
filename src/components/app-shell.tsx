import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import {
  ScanLine, LayoutDashboard, FileText, Clock, LogOut,
  Users, DoorOpen, Tags, Boxes, ClipboardList, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, type ReactNode } from "react";

const studentNav = [
  { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { to: "/justificativas", label: "Justificativas", icon: FileText },
  { to: "/extrato", label: "Extrato", icon: Clock },
];

const adminNav = [
  { to: "/admin", label: "Visão geral", icon: Shield },
  { to: "/admin/salas", label: "Salas", icon: DoorOpen },
  { to: "/admin/usuarios", label: "Usuários", icon: Users },
  { to: "/admin/tags", label: "Tags RFID", icon: Tags },
  { to: "/admin/eventos", label: "Eventos", icon: ClipboardList },
  { to: "/admin/inventario", label: "Inventário", icon: Boxes },
];

export function AppShell({ children, mode }: { children: ReactNode; mode: "student" | "admin" }) {
  const { user, loading, signOut, isAdmin } = useAuth();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [loading, user, nav]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  const items = mode === "admin" ? adminNav : studentNav;

  return (
    <div className="flex min-h-screen bg-secondary/40">
      <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ScanLine className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-tight">FrequênciaTAG</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map((it) => {
            const active = path === it.to;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
          {isAdmin && mode === "student" && (
            <Link to="/admin" className="mt-4 flex items-center gap-3 rounded-md border border-dashed border-border px-3 py-2 text-sm text-foreground hover:bg-secondary">
              <Shield className="h-4 w-4" /> Painel ADM
            </Link>
          )}
          {mode === "admin" && (
            <Link to="/dashboard" className="mt-4 flex items-center gap-3 rounded-md border border-dashed border-border px-3 py-2 text-sm text-foreground hover:bg-secondary">
              <LayoutDashboard className="h-4 w-4" /> Painel aluno
            </Link>
          )}
        </nav>
        <div className="border-t border-border p-3">
          <div className="px-3 pb-2 text-xs text-muted-foreground truncate">{user.email}</div>
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={async () => { await signOut(); nav({ to: "/login" }); }}>
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1">
        <div className="mx-auto max-w-7xl p-6 md:p-10">{children}</div>
      </main>
    </div>
  );
}
