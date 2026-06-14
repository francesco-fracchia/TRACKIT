"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import {
  createCategoryRuleAction,
  deleteCategoryRuleAction,
  revertImportAction,
} from "@/server/actions/imports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function RevertBatchButton({
  spaceId,
  batchId,
}: {
  spaceId: string;
  batchId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <span className="flex gap-1">
        <Button
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await revertImportAction(spaceId, batchId);
            })
          }
        >
          Conferma annullamento
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
          No
        </Button>
      </span>
    );
  }
  return (
    <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
      Annulla import
    </Button>
  );
}

export function CategoryRuleManager({
  spaceId,
  categories,
}: {
  spaceId: string;
  categories: { id: string; name: string }[];
}) {
  const [pattern, setPattern] = useState("");
  const [matchType, setMatchType] = useState<"contains" | "regex">("contains");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await createCategoryRuleAction(spaceId, {
            matchType,
            pattern,
            categoryId,
          });
          if (res.error) setError(res.error);
          else setPattern("");
        });
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="rule-pattern">Se la descrizione…</Label>
        <div className="flex gap-2">
          <select
            className={selectClass}
            value={matchType}
            onChange={(e) => setMatchType(e.target.value as "contains" | "regex")}
          >
            <option value="contains">contiene</option>
            <option value="regex">corrisponde a (regex)</option>
          </select>
          <Input
            id="rule-pattern"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="es. esselunga"
            className="flex-1"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="rule-cat">…assegna la categoria</Label>
        <select
          id="rule-cat"
          className={selectClass + " w-full"}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="sm" disabled={pending || !pattern.trim()}>
        Aggiungi regola
      </Button>
    </form>
  );
}

export function DeleteRuleButton({
  spaceId,
  id,
}: {
  spaceId: string;
  id: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Elimina regola"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deleteCategoryRuleAction(spaceId, id);
        })
      }
    >
      <Trash2 aria-hidden className="text-muted-foreground" />
    </Button>
  );
}
