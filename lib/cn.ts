import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge must know the custom font-size tokens (DESIGN.md §3.5); otherwise
 * `text-small` and `text-muted` look like the same group and one gets dropped.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["h1", "kpi", "stat", "h2", "h3", "body", "body-sm", "small", "axis", "brand", "donut", "input-mobile"] },
      ],
      rounded: [{ rounded: ["pill", "card", "shell"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
