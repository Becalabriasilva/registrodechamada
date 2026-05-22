import { Moon, Sun, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/hooks/use-preferences";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PreferencesToggle() {
  const { theme, toggleTheme, fontSize, setFontSize } = usePreferences();
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
        title={theme === "dark" ? "Modo claro" : "Modo escuro"}
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Tamanho da fonte" title="Tamanho da fonte">
            <Type className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Tamanho da fonte</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {([
            ["sm", "Pequena"],
            ["base", "Padrão"],
            ["lg", "Grande"],
            ["xl", "Muito grande"],
          ] as const).map(([k, label]) => (
            <DropdownMenuItem key={k} onClick={() => setFontSize(k)} className={fontSize === k ? "font-semibold" : ""}>
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
