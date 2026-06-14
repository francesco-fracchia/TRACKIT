import type { CategoryKind } from "@/db/schema";

export interface DefaultCategory {
  name: string;
  kind: CategoryKind;
  icon?: string;
  color?: string;
}

/**
 * Categorie di default (italiane) seminate alla creazione di uno spazio.
 * L'utente può poi modificarle/eliminarle liberamente.
 */
export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  // Entrate
  { name: "Stipendio", kind: "income", color: "#16a34a" },
  { name: "Entrate extra", kind: "income", color: "#22c55e" },
  { name: "Rimborsi", kind: "income", color: "#4ade80" },
  // Uscite
  { name: "Casa", kind: "expense", color: "#ef4444" },
  { name: "Spesa alimentare", kind: "expense", color: "#f97316" },
  { name: "Trasporti", kind: "expense", color: "#eab308" },
  { name: "Bollette", kind: "expense", color: "#06b6d4" },
  { name: "Salute", kind: "expense", color: "#ec4899" },
  { name: "Svago", kind: "expense", color: "#8b5cf6" },
  { name: "Ristoranti", kind: "expense", color: "#f59e0b" },
  { name: "Abbonamenti", kind: "expense", color: "#3b82f6" },
  { name: "Altro", kind: "expense", color: "#6b7280" },
] as const;
