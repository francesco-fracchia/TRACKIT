"use client";

import { useState } from "react";
import { createSharedExpenseAction } from "@/server/actions/sharing";
import type { SplitMode } from "@/lib/validation/sharing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MemberOpt {
  userId: string;
  name: string;
}

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const MODE_LABELS: Record<SplitMode, string> = {
  equal: "Equa",
  percent: "Percentuale",
  amount: "Importi",
};

export function SharedExpenseForm({
  spaceId,
  members,
  today,
}: {
  spaceId: string;
  members: MemberOpt[];
  today: string;
}) {
  const [description, setDescription] = useState("");
  const [total, setTotal] = useState("");
  const [date, setDate] = useState(today);
  const [paidBy, setPaidBy] = useState(members[0]?.userId ?? "");
  const [mode, setMode] = useState<SplitMode>("equal");
  const [selected, setSelected] = useState<Set<string>>(
    new Set(members.map((m) => m.userId)),
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggle(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const participants = members
      .filter((m) => selected.has(m.userId))
      .map((m) => ({
        userId: m.userId,
        value: mode === "equal" ? undefined : (values[m.userId] ?? ""),
      }));
    if (participants.length === 0) {
      setError("Seleziona almeno un partecipante");
      return;
    }
    setBusy(true);
    const res = await createSharedExpenseAction(spaceId, {
      description,
      total,
      date,
      paidBy,
      mode,
      participants,
    });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setDescription("");
    setTotal("");
    setValues({});
  }

  if (members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aggiungi membri allo spazio per dividere le spese.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="se-desc">Descrizione</Label>
        <Input
          id="se-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Es. Cena, spesa…"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="se-total">Totale</Label>
          <Input
            id="se-total"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="0,00"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="se-date">Data</Label>
          <Input
            id="se-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="se-paid">Pagato da</Label>
          <select
            id="se-paid"
            className={selectClass}
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
          >
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="se-mode">Divisione</Label>
          <select
            id="se-mode"
            className={selectClass}
            value={mode}
            onChange={(e) => setMode(e.target.value as SplitMode)}
          >
            {(Object.keys(MODE_LABELS) as SplitMode[]).map((m) => (
              <option key={m} value={m}>
                {MODE_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <Label>Partecipanti</Label>
        <ul className="space-y-1 rounded-md border p-2">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`p-${m.userId}`}
                checked={selected.has(m.userId)}
                onChange={() => toggle(m.userId)}
              />
              <label htmlFor={`p-${m.userId}`} className="flex-1 text-sm">
                {m.name}
              </label>
              {mode !== "equal" && selected.has(m.userId) && (
                <Input
                  value={values[m.userId] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [m.userId]: e.target.value }))
                  }
                  placeholder={mode === "percent" ? "%" : "0,00"}
                  className="h-8 w-24"
                  aria-label={`Quota di ${m.name}`}
                />
              )}
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={busy}>
        {busy ? "Salvataggio…" : "Aggiungi spesa"}
      </Button>
    </form>
  );
}
