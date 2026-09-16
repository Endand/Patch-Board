"use client";

import { useSyncExternalStore } from "react";

const KEY_STORAGE = "pb-key";
const NAME_STORAGE = "pb-name";
const VOTED_STORAGE = "pb-voted";

/**
 * Browser-only state, read through useSyncExternalStore rather than an effect
 * so the server snapshot is explicit and there is no cascading render on
 * mount. Every read is wrapped: private windows and blocked site data both
 * throw rather than returning empty.
 */
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Other tabs changing the same keys should update this one too.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function emit() {
  for (const listener of listeners) listener();
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Not persisting is survivable. This visit still behaves correctly.
  }
}

/**
 * A random per-browser id. It is how "these are my cards" works without
 * accounts, and it is a convenience, never a permission: it is trivially
 * forged, so the server must not trust it for anything that matters.
 */
let cachedKey: string | null = null;

function snapshotKey(): string {
  if (cachedKey) return cachedKey;
  cachedKey = read(KEY_STORAGE);
  if (!cachedKey) {
    cachedKey = crypto.randomUUID();
    write(KEY_STORAGE, cachedKey);
  }
  return cachedKey;
}

/** Empty until mounted, so server and first client render agree. */
export function useClientKey(): string {
  return useSyncExternalStore(subscribe, snapshotKey, () => "");
}

export function useDisplayName(): string {
  return useSyncExternalStore(
    subscribe,
    () => read(NAME_STORAGE) ?? "",
    () => "",
  );
}

export function setDisplayName(name: string) {
  write(NAME_STORAGE, name || null);
  emit();
}

/**
 * Which cards this browser has voted on. The server owns the count; this only
 * decides whether the arrow renders as pressed.
 */
let cachedVotes: Set<string> | null = null;

function votes(): Set<string> {
  if (cachedVotes) return cachedVotes;
  try {
    cachedVotes = new Set(JSON.parse(read(VOTED_STORAGE) ?? "[]"));
  } catch {
    cachedVotes = new Set();
  }
  return cachedVotes;
}

export function useHasVoted(cardId: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => votes().has(cardId),
    () => false,
  );
}

export function setVoted(cardId: string, voted: boolean) {
  const set = votes();
  if (voted) set.add(cardId);
  else set.delete(cardId);
  write(VOTED_STORAGE, JSON.stringify([...set]));
  emit();
}

/** Colour theme, shared with the inline script in layout.tsx. */
export const THEME_STORAGE = "pb-theme";

export type Theme = "light" | "dark" | "system";

export function useTheme(): Theme {
  return useSyncExternalStore(
    subscribe,
    () => {
      const stored = read(THEME_STORAGE);
      return stored === "light" || stored === "dark" ? stored : "system";
    },
    () => "system",
  );
}

export function setTheme(theme: Theme) {
  write(THEME_STORAGE, theme === "system" ? null : theme);
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  emit();
}
