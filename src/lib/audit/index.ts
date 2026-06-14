import "server-only";
import { db } from "@/db";
import { auditLog, type AuditAction } from "@/db/schema";

export interface AuditEntry {
  action: AuditAction;
  actorUserId?: string;
  organizationId?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

/**
 * Registra un'azione sensibile nell'audit log (append-only).
 * Da chiamare nelle Server Actions per login, cambi permessi, cancellazioni,
 * export, import commit/revert, modifiche 2FA, creazione/cancellazione spazi.
 *
 * Non deve mai far fallire l'operazione principale: in caso di errore di
 * scrittura logga ma non rilancia.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLog).values({
      action: entry.action,
      actorUserId: entry.actorUserId ?? null,
      organizationId: entry.organizationId ?? null,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata ?? null,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
    });
  } catch (err) {
    console.error("[audit] scrittura fallita:", err);
  }
}
