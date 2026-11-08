"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * One button, two segments (DESIGN.md §5). The active segment is styled from the
 * `.dark` class, so the server render and the first client render match.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const isDark = mounted && resolvedTheme === "dark";
  const label = !mounted ? "Ganti tema" : isDark ? "Ganti ke tema terang" : "Ganti ke tema gelap";

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="print-hidden inline-flex h-11 items-center gap-0.5 rounded-pill border border-border bg-surface p-0.5"
    >
      <span className="inline-flex h-[34px] w-9 items-center justify-center rounded-pill bg-primary text-primary-foreground dark:bg-transparent dark:text-muted">
        <Sun aria-hidden size={16} strokeWidth={1.75} />
      </span>
      <span className="inline-flex h-[34px] w-9 items-center justify-center rounded-pill text-muted dark:bg-primary dark:text-primary-foreground">
        <Moon aria-hidden size={16} strokeWidth={1.75} />
      </span>
    </button>
  );
}
