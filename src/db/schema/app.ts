import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { newId } from "../../lib/id";
import { organization } from "./auth";

/**
 * Schema di dominio TRACKIT.
 *
 * Nota architetturale: lo `space` è modellato come *organization* di Better
 * Auth (membri/inviti/ruoli gestiti dal plugin `organization`, tabelle in
 * `auth.ts`). Qui aggiungiamo solo i campi di dominio dello spazio in una
 * tabella 1:1 (`space_profile`) collegata via `organization_id`.
 *
 * `space_profile` ha una FK reale verso `organization` (cascade): eliminando
 * lo spazio si elimina il profilo. `audit_log` invece NON ha FK verso
 * organization/user: è append-only e deve sopravvivere alla cancellazione
 * delle entità a cui si riferisce (storico immutabile).
 */

/** Tipo di spazio: l'utente decide come dividere personale/business. */
export const SPACE_TYPES = ["personal", "business", "shared"] as const;
export type SpaceType = (typeof SPACE_TYPES)[number];

export const spaceProfile = sqliteTable(
  "space_profile",
  {
    organizationId: text("organization_id")
      .primaryKey()
      .references(() => organization.id, { onDelete: "cascade" }),
    type: text("type", { enum: SPACE_TYPES }).notNull().default("personal"),
    baseCurrency: text("base_currency").notNull().default("EUR"),
    /** JSON: campi extra business, flag (es. require2fa), ecc. */
    settings: text("settings", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'`),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("space_profile_type_idx").on(t.type)],
);

/**
 * Azioni sensibili tracciate. Append-only: l'app non aggiorna né cancella righe.
 * `organization_id` è nullable per eventi globali (es. login non legato a uno
 * spazio).
 */
export const AUDIT_ACTIONS = [
  "auth.login",
  "auth.logout",
  "auth.register",
  "auth.password_reset",
  "auth.2fa_enabled",
  "auth.2fa_disabled",
  "space.created",
  "space.deleted",
  "space.member_added",
  "space.member_role_changed",
  "space.member_removed",
  "data.deleted",
  "data.exported",
  "import.committed",
  "import.reverted",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    organizationId: text("organization_id"),
    actorUserId: text("actor_user_id"),
    action: text("action", { enum: AUDIT_ACTIONS }).notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    metadata: text("metadata", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    index("audit_log_org_idx").on(t.organizationId),
    index("audit_log_actor_idx").on(t.actorUserId),
    index("audit_log_created_idx").on(t.createdAt),
  ],
);
