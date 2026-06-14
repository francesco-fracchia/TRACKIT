import { v7 as uuidv7 } from "uuid";

/**
 * Genera un identificatore. Usiamo UUIDv7: ordinabile per tempo (k-sortable),
 * utile per chiavi primarie indicizzate e ordinamento cronologico naturale.
 */
export function newId(): string {
  return uuidv7();
}
