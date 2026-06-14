import { createAccessControl } from "better-auth/plugins/access";
import {
  defaultStatements,
  ownerAc,
  adminAc,
  memberAc,
} from "better-auth/plugins/organization/access";

/**
 * Access control per il plugin organization (spazi). Aggiunge il ruolo
 * `viewer` (sola lettura) ai ruoli nativi owner/admin/member.
 *
 * NB: questo AC governa i permessi sulle operazioni del plugin (gestione
 * membri/inviti/spazio). I permessi sui dati di dominio (conti, transazioni)
 * sono applicati dal nostro DAL via `requireSpaceMember` + gerarchia ruoli.
 *
 * Modulo isomorfo: importato sia da server (`auth`) sia da client.
 */
export const ac = createAccessControl(defaultStatements);

export const roles = {
  owner: ownerAc,
  admin: adminAc,
  member: memberAc,
  // viewer: nessun permesso di gestione → sola consultazione.
  viewer: ac.newRole({}),
};
