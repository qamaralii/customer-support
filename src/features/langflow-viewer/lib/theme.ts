import { useEffect, useState } from "react";

export type ResolvedTheme = "light" | "dark";

function prefersDark(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;
}

export function useResolvedTheme(theme: "light" | "dark" | "auto" = "auto"): ResolvedTheme {
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    theme === "auto" ? (prefersDark() ? "dark" : "light") : theme,
  );

  useEffect(() => {
    if (theme !== "auto") {
      setResolved(theme);
      return;
    }
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setResolved(query.matches ? "dark" : "light");
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [theme]);

  return resolved;
}
