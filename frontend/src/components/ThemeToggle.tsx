"use client";

import { nextTheme, useTheme, type ThemeMode } from "@/lib/useTheme";

const LABEL: Record<ThemeMode, string> = { system: "System", light: "Light", dark: "Dark" };

function Icon({ mode }: { mode: ThemeMode }) {
  const props = { width: 14, height: 14, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.5, "aria-hidden": true };
  if (mode === "light")
    return (
      <svg {...props}>
        <circle cx="8" cy="8" r="3" />
        <path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.4 3.4l1.3 1.3M11.3 11.3l1.3 1.3M12.6 3.4l-1.3 1.3M4.7 11.3l-1.3 1.3" />
      </svg>
    );
  if (mode === "dark")
    return (
      <svg {...props}>
        <path d="M13.5 9.6A5.7 5.7 0 0 1 6.4 2.5a5.7 5.7 0 1 0 7.1 7.1z" />
      </svg>
    );
  return (
    <svg {...props}>
      <rect x="2" y="3" width="12" height="8" rx="1.2" />
      <path d="M6 13.5h4M8 11v2.5" />
    </svg>
  );
}

export function ThemeToggle() {
  const { mode, cycle } = useTheme();
  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${LABEL[mode]}. Switch to ${LABEL[nextTheme(mode)]}`}
      title="Change theme (T)"
      className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-navy/5 hover:text-navy"
    >
      <Icon mode={mode} />
      {LABEL[mode]}
    </button>
  );
}
