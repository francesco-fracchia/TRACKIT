/**
 * Gerarchia dei ruoli di spazio. Logica pura e testabile, separata dall'I/O.
 * owner > admin > member > viewer.
 */
export const ROLE_RANK = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
} as const;

export type Role = keyof typeof ROLE_RANK;

export function isRole(value: string): value is Role {
  return value in ROLE_RANK;
}

/**
 * True se `role` soddisfa il requisito minimo `minRole`. Un ruolo sconosciuto
 * (non presente nella gerarchia) viene trattato come NON sufficiente:
 * fail-closed, mai fail-open.
 */
export function hasSufficientRole(role: string, minRole: Role): boolean {
  if (!isRole(role)) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}
