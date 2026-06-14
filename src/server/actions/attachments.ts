"use server";

import { put } from "@vercel/blob";
import { serverEnv } from "@/env";
import { requireSpaceMember } from "@/server/dal/context";
import { createAttachment } from "@/server/dal/attachments";
import { newId } from "@/lib/id";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
];

export interface UploadResult {
  id?: string;
  url?: string;
  error?: string;
}

/**
 * Carica un allegato su Vercel Blob e ne registra i metadati. Richiede ruolo
 * >= member e che lo storage sia configurato. Valida tipo e dimensione.
 */
export async function uploadAttachmentAction(
  spaceId: string,
  formData: FormData,
): Promise<UploadResult> {
  const ctx = await requireSpaceMember(spaceId, "member");

  const token = serverEnv.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return { error: "Storage allegati non configurato" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Nessun file selezionato" };
  }
  if (file.size > MAX_BYTES) {
    return { error: "File troppo grande (max 5 MB)" };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Tipo di file non consentito (PNG, JPEG, WEBP, PDF)" };
  }

  // Chiave non indovinabile, isolata per spazio.
  const key = `spaces/${spaceId}/${newId()}-${file.name}`;
  const blob = await put(key, file, { access: "public", token });

  const id = await createAttachment(spaceId, {
    storageKey: blob.url,
    mime: file.type,
    size: file.size,
    uploadedBy: ctx.userId,
  });

  return { id, url: blob.url };
}
