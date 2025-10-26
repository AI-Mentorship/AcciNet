"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type ThemeCtx = {
  isDark: boolean;
  toggle: () => void;
  setDark: (v: boolean) => void;
};
type DestLocation = {
  lat?: number;
  lng?: number;
  formattedAddress?: string;
}

const DestContext = createContext<DestLocation | null>(null);
const ThemeContext = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // optional: reflect on <html> for CSS hooks / Tailwind
  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    document.documentElement.setAttribute("data-isDark", String(isDark));
  }, [isDark]);

  const value = useMemo(
    () => ({
      isDark,
      toggle: () => setIsDark(d => !d),
      setDark: (v: boolean) => setIsDark(!!v),
    }),
    [isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
/*
export function DestProvider({children}:{children:React.ReactNode}){
  const [dest, setDest] = useState<DestLocation | null>(null);
  const value = useMemo(
    () => ({
      dest,
      setDest: (v: DestLocation | null) => setDest(v),
    }),
    [dest]
  );

  return <DestContext.Provider value={value}>{children}</DestContext.Provider>;

}
  */

export default function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}
