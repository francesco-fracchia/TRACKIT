"use client";

import { useState } from "react";
import {
  inspectCsvAction,
  previewImportAction,
  commitImportAction,
} from "@/server/actions/imports";
import type { ColumnMapping } from "@/server/services/import";
import type { ImportPreview, CommitResult } from "@/server/dal/imports";
import { formatMoney, money } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Preset {
  bankName: string;
  columnMapping: Record<string, unknown> | null;
}

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Step = "upload" | "map" | "preview" | "done";

export function ImportWizard({
  spaceId,
  accounts,
  presets,
  currency,
}: {
  spaceId: string;
  accounts: { id: string; name: string }[];
  presets: Preset[];
  currency: string;
}) {
  const [step, setStep] = useState<Step>("upload");
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [fields, setFields] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: "",
    amount: "",
    payee: "",
    dateFormat: "dmy",
  });
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [bankName, setBankName] = useState("");
  const [savePreset, setSavePreset] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const text = await file.text();
    setCsvText(text);
    setFileName(file.name);
    setBusy(true);
    const res = await inspectCsvAction(spaceId, text);
    setBusy(false);
    if (res.error || !res.fields) {
      setError(res.error ?? "CSV non valido");
      return;
    }
    setFields(res.fields);
    setStep("map");
  }

  function applyPreset(bank: string) {
    const p = presets.find((x) => x.bankName === bank);
    if (p?.columnMapping) {
      setMapping(p.columnMapping as unknown as ColumnMapping);
      setBankName(bank);
    }
  }

  async function doPreview() {
    setError(null);
    setBusy(true);
    const res = await previewImportAction(spaceId, csvText, mapping);
    setBusy(false);
    if (res.error || !res.preview) {
      setError(res.error ?? "Anteprima fallita");
      return;
    }
    setPreview(res.preview);
    setStep("preview");
  }

  async function doCommit() {
    setError(null);
    setBusy(true);
    const res = await commitImportAction(
      spaceId,
      csvText,
      mapping,
      accountId,
      bankName || undefined,
      fileName || undefined,
      savePreset,
    );
    setBusy(false);
    if (res.error || !res.result) {
      setError(res.error ?? "Import fallito");
      return;
    }
    setResult(res.result);
    setStep("done");
  }

  function reset() {
    setStep("upload");
    setCsvText("");
    setFileName("");
    setFields([]);
    setPreview(null);
    setResult(null);
    setError(null);
  }

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {step === "upload" && (
        <div className="space-y-3">
          <Label htmlFor="csv-file">File CSV dell&apos;estratto conto</Label>
          <input
            id="csv-file"
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            disabled={busy}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-transparent file:px-3 file:py-1 file:text-sm"
          />
          {presets.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Mappature salvate: {presets.map((p) => p.bankName).join(", ")}
            </p>
          )}
        </div>
      )}

      {step === "map" && (
        <div className="space-y-4">
          {presets.length > 0 && (
            <div className="space-y-1">
              <Label>Usa una mappatura salvata</Label>
              <select
                className={selectClass}
                defaultValue=""
                onChange={(e) => e.target.value && applyPreset(e.target.value)}
              >
                <option value="">—</option>
                {presets.map((p) => (
                  <option key={p.bankName} value={p.bankName}>
                    {p.bankName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {(["date", "amount", "payee"] as const).map((key) => {
              const label =
                key === "date"
                  ? "Colonna data"
                  : key === "amount"
                    ? "Colonna importo"
                    : "Colonna descrizione";
              return (
              <div key={key} className="space-y-1">
                <Label>{label}</Label>
                <select
                  aria-label={label}
                  className={selectClass}
                  value={mapping[key]}
                  onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value }))}
                >
                  <option value="">Seleziona…</option>
                  {fields.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              );
            })}
            <div className="space-y-1">
              <Label>Formato data</Label>
              <select
                className={selectClass}
                value={mapping.dateFormat}
                onChange={(e) =>
                  setMapping((m) => ({ ...m, dateFormat: e.target.value as "iso" | "dmy" }))
                }
              >
                <option value="dmy">GG/MM/AAAA</option>
                <option value="iso">AAAA-MM-GG</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Conto di destinazione</Label>
              <select
                className={selectClass}
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="bank">Banca (per salvare la mappatura)</Label>
              <Input id="bank" value={bankName} onChange={(e) => setBankName(e.target.value)} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={savePreset}
              onChange={(e) => setSavePreset(e.target.checked)}
            />
            Salva questa mappatura per la banca indicata
          </label>

          <div className="flex gap-2">
            <Button onClick={doPreview} disabled={busy}>
              {busy ? "Elaborazione…" : "Anteprima"}
            </Button>
            <Button variant="ghost" onClick={reset} disabled={busy}>
              Annulla
            </Button>
          </div>
        </div>
      )}

      {step === "preview" && preview && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {preview.total} righe · {preview.duplicates} duplicati ·{" "}
            {preview.invalid} non valide. I duplicati e le righe non valide
            verranno saltati.
          </p>
          <div className="max-h-96 overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b bg-muted/80 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Descrizione</th>
                  <th className="px-3 py-2">Categoria</th>
                  <th className="px-3 py-2 text-right">Importo</th>
                  <th className="px-3 py-2">Stato</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-1.5 tabular-nums">{r.valueDate}</td>
                    <td className="px-3 py-1.5">{r.payee}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {r.suggestedCategoryName ?? "—"}
                    </td>
                    <td
                      className={`px-3 py-1.5 text-right font-mono tabular-nums ${r.type === "income" ? "text-green-600 dark:text-green-500" : "text-destructive"}`}
                    >
                      {formatMoney(money(r.amount, currency))}
                    </td>
                    <td className="px-3 py-1.5 text-xs">
                      {r.invalid ? (
                        <span className="text-destructive">non valida</span>
                      ) : r.duplicate ? (
                        <span className="text-amber-600">duplicato</span>
                      ) : (
                        <span className="text-green-600">nuova</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Button onClick={doCommit} disabled={busy}>
              {busy
                ? "Import…"
                : `Importa ${preview.total - preview.duplicates - preview.invalid}`}
            </Button>
            <Button variant="ghost" onClick={() => setStep("map")} disabled={busy}>
              Indietro
            </Button>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="space-y-3">
          <p className="rounded-md bg-green-600/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
            Importate {result.imported} transazioni ({result.skipped} saltate).
          </p>
          <Button onClick={reset}>Nuovo import</Button>
        </div>
      )}
    </div>
  );
}
