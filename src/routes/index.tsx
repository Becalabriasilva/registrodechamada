import { createFileRoute, Link } from "@tanstack/react-router";
import { ScanLine, ShieldCheck, BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ScanLine className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">FrequênciaTAG</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost">Entrar</Button></Link>
            <Link to="/signup"><Button>Criar conta</Button></Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-3xl">
          <span className="inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            RFID · Acadêmico · Tempo real
          </span>
          <h1 className="mt-6 text-5xl font-bold tracking-tight md:text-6xl">
            Controle de presença e materiais, automatizado por TAG.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Registre entradas e saídas via leitor RFID, gerencie justificativas, salas e estoque
            em uma plataforma única e profissional.
          </p>
          <div className="mt-8 flex gap-3">
            <Link to="/login">
              <Button size="lg" className="gap-2">
                Acessar painel <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="lg" variant="outline">Cadastrar aluno</Button>
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-3">
          {[
            { icon: ScanLine, title: "Leitura RFID", desc: "Hardware externo registra eventos automaticamente no banco." },
            { icon: ShieldCheck, title: "Justificativas", desc: "Upload de atestados em PDF/imagem com aprovação do ADM." },
            { icon: BarChart3, title: "Relatórios", desc: "Filtros por turma, aluno e período com extrato detalhado." },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border border-border bg-card p-6">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
