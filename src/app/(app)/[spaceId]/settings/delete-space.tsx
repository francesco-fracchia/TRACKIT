"use client";

import { useState } from "react";
import { deleteSpaceAction } from "@/server/actions/spaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Eliminazione definitiva dello spazio con conferma tramite digitazione del
 * nome esatto (stile GitHub). L'azione server verifica owner + nome.
 */
export function DeleteSpace({
  spaceId,
  spaceName,
}: {
  spaceId: string;
  spaceName: string;
}) {
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canDelete = confirm.trim() === spaceName;

  async function onDelete() {
    setError(null);
    setBusy(true);
    const res = await deleteSpaceAction(spaceId, confirm);
    // In caso di successo l'action reindirizza; qui gestiamo solo l'errore.
    if (res?.error) {
      setError(res.error);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-destructive/40 p-4">
      <div>
        <h3 className="font-medium text-destructive">Elimina questo spazio</h3>
        <p className="text-sm text-muted-foreground">
          Operazione <strong>irreversibile</strong>: verranno cancellati per
          sempre conti, transazioni, budget, obiettivi, ricorrenze, spese
          condivise, revisioni e membri di questo spazio.
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="confirm-name">
          Per confermare, digita il nome dello spazio:{" "}
          <span className="font-mono font-medium text-foreground">
            {spaceName}
          </span>
        </Label>
        <Input
          id="confirm-name"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="off"
          placeholder={spaceName}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        variant="destructive"
        disabled={!canDelete || busy}
        onClick={onDelete}
      >
        {busy ? "Eliminazione…" : "Elimina definitivamente"}
      </Button>
    </div>
  );
}
