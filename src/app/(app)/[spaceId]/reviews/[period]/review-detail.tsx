"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import {
  saveNotesAction,
  addActionItemAction,
  toggleActionItemAction,
  deleteActionItemAction,
  closeReviewAction,
  reopenReviewAction,
} from "@/server/actions/reviews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function NotesEditor({
  spaceId,
  reviewId,
  period,
  initial,
  disabled,
}: {
  spaceId: string;
  reviewId: string;
  period: string;
  initial: string;
  disabled: boolean;
}) {
  const [notes, setNotes] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-2">
      <textarea
        value={notes}
        disabled={disabled}
        onChange={(e) => {
          setNotes(e.target.value);
          setSaved(false);
        }}
        rows={4}
        placeholder="Note del mese: cosa è andato bene, cosa migliorare…"
        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      />
      {!disabled && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await saveNotesAction(spaceId, reviewId, period, notes);
                setSaved(true);
              })
            }
          >
            Salva note
          </Button>
          {saved && <span className="text-xs text-muted-foreground">Salvato</span>}
        </div>
      )}
    </div>
  );
}

interface ActionItemView {
  id: string;
  text: string;
  done: boolean;
  assigneeName: string | null;
}

export function ActionItems({
  spaceId,
  reviewId,
  period,
  items,
  members,
  disabled,
}: {
  spaceId: string;
  reviewId: string;
  period: string;
  items: ActionItemView[];
  members: { userId: string; name: string }[];
  disabled: boolean;
}) {
  const [text, setText] = useState("");
  const [assignee, setAssignee] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <ul className="divide-y rounded-md border">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={it.done}
                disabled={pending}
                onChange={() =>
                  startTransition(async () => {
                    await toggleActionItemAction(spaceId, it.id, period, !it.done);
                  })
                }
              />
              <span className={`flex-1 ${it.done ? "text-muted-foreground line-through" : ""}`}>
                {it.text}
                {it.assigneeName && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    @{it.assigneeName}
                  </span>
                )}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Elimina"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await deleteActionItemAction(spaceId, it.id, period);
                  })
                }
              >
                <Trash2 aria-hidden className="text-muted-foreground" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {!disabled && (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            startTransition(async () => {
              await addActionItemAction(
                spaceId,
                reviewId,
                period,
                text,
                assignee || undefined,
              );
              setText("");
            });
          }}
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Nuovo proposito / azione…"
            className="flex-1"
          />
          {members.length > 1 && (
            <select
              className={selectClass}
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              aria-label="Assegna a"
            >
              <option value="">Nessuno</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
          <Button type="submit" size="sm" disabled={pending || !text.trim()}>
            Aggiungi
          </Button>
        </form>
      )}
    </div>
  );
}

export function CloseReopenButton({
  spaceId,
  period,
  status,
}: {
  spaceId: string;
  period: string;
  status: "open" | "closed";
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant={status === "open" ? "default" : "outline"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (status === "open") await closeReviewAction(spaceId, period);
          else await reopenReviewAction(spaceId, period);
        })
      }
    >
      {status === "open" ? "Chiudi revisione" : "Riapri revisione"}
    </Button>
  );
}
