"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getOrCreateReview,
  closeReview,
  reopenReview,
  saveReviewNotes,
  addActionItem,
  toggleActionItem,
  deleteActionItem,
} from "@/server/dal/reviews";

export interface ActionResult {
  ok?: true;
  error?: string;
}

const PERIOD_RE = /^\d{4}-\d{2}$/;

export async function openReviewAction(
  spaceId: string,
  period: string,
): Promise<ActionResult | never> {
  if (!PERIOD_RE.test(period)) return { error: "Periodo non valido" };
  await getOrCreateReview(spaceId, period);
  redirect(`/${spaceId}/reviews/${period}`);
}

export async function closeReviewAction(
  spaceId: string,
  period: string,
): Promise<ActionResult> {
  await closeReview(spaceId, period);
  revalidatePath(`/${spaceId}/reviews/${period}`);
  revalidatePath(`/${spaceId}/reviews`);
  return { ok: true };
}

export async function reopenReviewAction(
  spaceId: string,
  period: string,
): Promise<ActionResult> {
  await reopenReview(spaceId, period);
  revalidatePath(`/${spaceId}/reviews/${period}`);
  return { ok: true };
}

export async function saveNotesAction(
  spaceId: string,
  reviewId: string,
  period: string,
  notes: string,
): Promise<ActionResult> {
  await saveReviewNotes(spaceId, reviewId, notes);
  revalidatePath(`/${spaceId}/reviews/${period}`);
  return { ok: true };
}

export async function addActionItemAction(
  spaceId: string,
  reviewId: string,
  period: string,
  text: string,
  assignee: string | undefined,
): Promise<ActionResult> {
  if (!text.trim()) return { error: "Inserisci un testo" };
  await addActionItem(spaceId, reviewId, text.trim(), assignee);
  revalidatePath(`/${spaceId}/reviews/${period}`);
  return { ok: true };
}

export async function toggleActionItemAction(
  spaceId: string,
  itemId: string,
  period: string,
  done: boolean,
): Promise<ActionResult> {
  await toggleActionItem(spaceId, itemId, done);
  revalidatePath(`/${spaceId}/reviews/${period}`);
  return { ok: true };
}

export async function deleteActionItemAction(
  spaceId: string,
  itemId: string,
  period: string,
): Promise<ActionResult> {
  await deleteActionItem(spaceId, itemId);
  revalidatePath(`/${spaceId}/reviews/${period}`);
  return { ok: true };
}
