"use client";

import {
  setTheme,
  useTheme,
  THEME_STORAGE,
  type Theme,
} from "@/lib/identity";

const OPTIONS: { value: Theme; label: string; glyph: string }[] = [
  { value: "light", label: "Light", glyph: "☀" },
  { value: "system", label: "System", glyph: "◐" },
  { value: "dark", label: "Dark", glyph: "☾" },
];

export function ThemeToggle() {
  const theme = useTheme();

  return (
    <div
      className="inline-flex rounded-full border border-edge bg-surface p-0.5"
      role="group"
      aria-label="Colour theme"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setTheme(option.value)}
          aria-pressed={theme === option.value}
          title={option.label}
          className={`rounded-full px-2.5 py-1 text-xs transition ${
            theme === option.value
              ? "bg-background font-medium text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          <span aria-hidden>{option.glyph}</span>
          <span className="sr-only">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Runs before first paint so a chosen theme never flashes the wrong way. */
export const THEME_SCRIPT = `
try {
  var t = localStorage.getItem(${JSON.stringify(THEME_STORAGE)});
  if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
} catch (e) {}
`;
