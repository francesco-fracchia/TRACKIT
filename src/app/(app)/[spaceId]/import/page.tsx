import { getSpace } from "@/server/dal/spaces";
import { listAccountOptions } from "@/server/dal/accounts";
import { listCategories } from "@/server/dal/categories";
import {
  listBatches,
  listPresets,
  listCategoryRules,
} from "@/server/dal/imports";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImportWizard } from "./import-wizard";
import {
  CategoryRuleManager,
  DeleteRuleButton,
  RevertBatchButton,
} from "./import-extras";

const MATCH_LABELS: Record<string, string> = {
  contains: "contiene",
  regex: "regex",
};

export default async function ImportPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const [space, accounts, categories, presets, batches, rules] =
    await Promise.all([
      getSpace(spaceId),
      listAccountOptions(spaceId),
      listCategories(spaceId),
      listPresets(spaceId),
      listBatches(spaceId),
      listCategoryRules(spaceId),
    ]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Import CSV</h2>
          <p className="text-sm text-muted-foreground">
            Carica un estratto conto, mappa le colonne, controlla l&apos;anteprima
            e importa. I duplicati vengono saltati e l&apos;import è annullabile.
          </p>
        </div>

        {accounts.length === 0 ? (
          <p className="text-muted-foreground">
            Crea prima un conto su cui importare le transazioni.
          </p>
        ) : (
          <ImportWizard
            spaceId={spaceId}
            accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
            presets={presets.map((p) => ({
              bankName: p.bankName,
              columnMapping: p.columnMapping,
            }))}
            currency={space.baseCurrency}
          />
        )}

        {batches.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium">Import precedenti</h3>
            <ul className="divide-y rounded-lg border text-sm">
              {batches.map((b) => (
                <li key={b.id} className="flex items-center justify-between px-4 py-2">
                  <div>
                    <p className="font-medium">{b.fileName ?? b.bankName ?? "Import"}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.importedCount} transazioni ·{" "}
                      {b.status === "reverted" ? "annullato" : "attivo"}
                    </p>
                  </div>
                  {b.status !== "reverted" && (
                    <RevertBatchButton spaceId={spaceId} batchId={b.id} />
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Regole di categorizzazione</CardTitle>
            <CardDescription>
              Assegna automaticamente una categoria in base alla descrizione.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {categories.filter((c) => c.kind === "expense").length > 0 && (
              <CategoryRuleManager
                spaceId={spaceId}
                categories={categories
                  .filter((c) => c.kind === "expense")
                  .map((c) => ({ id: c.id, name: c.name }))}
              />
            )}
            {rules.length > 0 && (
              <ul className="divide-y rounded-md border text-sm">
                {rules.map((r) => (
                  <li key={r.id} className="flex items-center justify-between px-3 py-2">
                    <span className="text-xs">
                      {MATCH_LABELS[r.matchType]} &quot;{r.pattern}&quot; →{" "}
                      {r.categoryName ?? "—"}
                    </span>
                    <DeleteRuleButton spaceId={spaceId} id={r.id} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
