import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { newId } from "../../lib/id";
import { organization, user } from "./auth";

/**
 * M7: revisione mensile ("l'incontro"). `monthly_review` con snapshot congelato
 * dei numeri al momento della chiusura; `review_action_item` per i punti da fare.
 */

export const REVIEW_STATUSES = ["open", "closed"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const monthlyReview = sqliteTable(
  "monthly_review",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    period: text("period").notNull(), // YYYY-MM
    status: text("status", { enum: REVIEW_STATUSES }).notNull().default("open"),
    /** Numeri congelati alla chiusura (JSON). Null finché aperta. */
    snapshot: text("snapshot", { mode: "json" }).$type<Record<string, unknown>>(),
    notes: text("notes"),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    closedAt: integer("closed_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
  },
  (t) => [unique("monthly_review_org_period_uq").on(t.organizationId, t.period)],
);

export const reviewActionItem = sqliteTable(
  "review_action_item",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    reviewId: text("review_id")
      .notNull()
      .references(() => monthlyReview.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    done: integer("done", { mode: "boolean" }).notNull().default(false),
    assignee: text("assignee").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("review_action_item_review_idx").on(t.reviewId)],
);
