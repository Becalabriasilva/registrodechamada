import { createFileRoute, Link } from "@tanstack/react-router";
import { ScanLine, ShieldCheck, BarChart3, ArrowRight, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KimonoBg } from "@/components/kimono-bg";
// 1. Importamos as ferramentas de lógica do React
import { useState, useEffect } from "react"; 

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  // 2. Criamos um "espaço na memória" para guardar as tags que virão do banco
  const [registros, setRegistros] = useState<any[]>([]);

  // 3. Função que busca os dados no exato momento em que o site abre
  useEffect(() => {
    async function buscarTagsNoBanco() {
      const url = "https://tceoaybrlljgqavbahzi.supabase.co/rest/v1/registros_rfid?select=*";
      const chavePublica = "sb_publishable_7dDGaSJdv8gqJ8a3sBcMmA_l4DMS5ra";
      const resposta = await fetch(url, {
        method: "GET",
        headers: {
          "apikey": chavePublica,
          "Authorization": `Bearer ${chavePublica}`,
          "Content-Type": "application/json"
        }
      });
      
      const dados = await resposta.json();
      setRegistros(dados); // Salva os dados recebidos na memória da tela
    }

    buscarTagsNoBanco();
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <KimonoBg />

      <header className="relative border-b border-border/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ScanLine className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">FrequentarAgora</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost">Entrar</Button></Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-3xl">
          <span className="inline-flex items-center rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-secondary-foreground backdrop-blur">
            RFID · Acadêmico · Tempo real
          </span>
          <h1 className="mt-6 text-5xl font-bold tracking-tight md:text-6xl">
            Controle de presença automatizado.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Registre entradas e saídas via leitor RFID, gerencie justificativas e relatórios
            em uma plataforma única e profissional.
          </p>
          <div className="mt-8 flex gap-3">
            <Link to="/login">
              <Button size="lg" className="gap-2">
                Acessar painel <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-3">
          {[
            { icon: ScanLine, title: "Leitura RFID", desc: "Hardware externo registra eventos automaticamente no banco." },
            { icon: ShieldCheck, title: "Justificativas", desc: "Upload de atestados em PDF/imagem com aprovação do ADM." },
            { icon: BarChart3, title: "Relatórios", desc: "Filtros por turma, aluno, sala e período com exportação CSV." },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border border-border bg-card/90 p-6 backdrop-blur">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* 4. AQUI É A NOSSA ÁREA DE TESTE VIZUALIZANDO O BANCO */}
        <div className="mt-16 rounded-lg border border-border bg-card/90 p-8 backdrop-blur">
          <div className="flex items-center gap-3 mb-6">
            <Database className="h-6 w-6 text-green-500" />
            <h2 className="text-2xl font-bold">Tags Lidas pelo Hardware (Ao Vivo)</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="pb-3 font-medium">ID Interno</th>
                  <th className="pb-3 font-medium">Código da Tag</th>
                  <th className="pb-3 font-medium">Data e Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {registros.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-muted-foreground">
                      Nenhuma tag registrada ainda...
                    </td>
                  </tr>
                ) : (
                  registros.map((registro) => (
                    <tr key={registro.id}>
                      <td className="py-4">{registro.id}</td>
                      <td className="py-4 font-mono font-semibold">{registro.tag_uid}</td>
                      <td className="py-4">{new Date(registro.created_at).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
