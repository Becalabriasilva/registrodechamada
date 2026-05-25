import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { simulateTagScan } from "@/lib/users.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Radio, RefreshCw, Zap } from "lucide-react";
import { toast } from "sonner";

interface Scan { id: number; tag_uid: string; created_at: string }

export function TagScanPicker({ onPick }: { onPick: (uid: string) => void }) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [simulate, setSimulate] = useState("");
  const sim = useServerFn(simulateTagScan);

  async function load() {
    const { data } = await supabase
      .from("registros_rfid" as never)
      .select("id,tag_uid,created_at")
      .order("created_at", { ascending: false })
      .limit(8);
    setScans((data ?? []) as Scan[]);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("registros-rfid")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "registros_rfid" }, (p) => {
        setScans((prev) => [p.new as Scan, ...prev].slice(0, 8));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <Card className="border-dashed">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Radio className="h-4 w-4 text-primary" /> Leituras recentes do leitor
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </div>

        {scans.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Aproxime uma tag do leitor — ela aparecerá aqui em tempo real. Você também pode simular abaixo.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {scans.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
                <div>
                  <div className="font-mono text-xs">{s.tag_uid}</div>
                  <div className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleString("pt-BR")}</div>
                </div>
                <Button type="button" size="sm" onClick={() => onPick(s.tag_uid)}>Usar</Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2 border-t border-border pt-3">
          <Input placeholder="UID para simular leitura" value={simulate} onChange={(e) => setSimulate(e.target.value)} />
          <Button
            type="button"
            variant="outline"
            disabled={!simulate}
            onClick={async () => {
              try {
                await sim({ data: { tag_uid: simulate } });
                setSimulate("");
                toast.success("Leitura simulada");
              } catch (e: any) { toast.error(e.message); }
            }}
            className="gap-1"
          >
            <Zap className="h-3.5 w-3.5" /> Simular
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
