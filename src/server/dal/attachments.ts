import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { attachment } from "@/db/schema";
import { serverEnv } from "@/env";

/** Indica se lo storage allegati è configurato (token Vercel Blob presente). */
export function attachmentsEnabled(): boolean {
  return Boolean(serverEnv.BLOB_READ_WRITE_TOKEN);
}

export interface CreateAttachmentInput {
  storageKey: string;
  mime: string;
  size: number;
  uploadedBy: string;
}

export async function createAttachment(
  spaceId: string,
  input: CreateAttachmentInput,
): Promise<string> {
  const rows = await db
    .insert(attachment)
    .values({ organizationId: spaceId, ...input })
    .returning({ id: attachment.id });
  return rows[0]!.id;
}

/** Verifica che un allegato appartenga allo spazio (anti-IDOR cross-space). */
export async function attachmentBelongsToSpace(
  spaceId: string,
  attachmentId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: attachment.id })
    .from(attachment)
    .where(
      and(
        eq(attachment.id, attachmentId),
        eq(attachment.organizationId, spaceId),
      ),
    )
    .limit(1);
  return Boolean(rows[0]);
}
