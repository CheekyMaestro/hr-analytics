"use client";

import { ThemeProvider as NextThemes } from "next-themes";
import type { ReactNode } from "react";

/** Theme preference is the only thing stored in the browser (RULES.md §7.5). */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem storageKey="hr-theme" disableTransitionOnChange>
      {children}
    </NextThemes>
  );
}
