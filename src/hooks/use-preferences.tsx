import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
type FontSize = "sm" | "base" | "lg" | "xl";

interface PrefsCtx {
  theme: Theme;
  fontSize: FontSize;
  toggleTheme: () => void;
  setFontSize: (s: FontSize) => void;
}

const Ctx = createContext<PrefsCtx | null>(null);

const FONT_PX: Record<FontSize, string> = { sm: "14px", base: "16px", lg: "18px", xl: "20px" };

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [fontSize, setFontSizeState] = useState<FontSize>("base");

  useEffect(() => {
    const t = (localStorage.getItem("pref-theme") as Theme | null) ?? "light";
    const f = (localStorage.getItem("pref-font") as FontSize | null) ?? "base";
    setTheme(t);
    setFontSizeState(f);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("pref-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.fontSize = FONT_PX[fontSize];
    localStorage.setItem("pref-font", fontSize);
  }, [fontSize]);

  return (
    <Ctx.Provider
      value={{
        theme,
        fontSize,
        toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
        setFontSize: setFontSizeState,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePreferences must be inside PreferencesProvider");
  return ctx;
}
