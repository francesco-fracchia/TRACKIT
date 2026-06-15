import Link from "next/link";
import { listMySpacesWithTotals } from "@/server/dal/spaces";
import { formatMoney, money } from "@/lib/money";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateSpaceForm } from "./create-space-form";

const TYPE_LABELS: Record<string, string> = {
  personal: "Personale",
  business: "Business",
  shared: "Condiviso",
};

export default async function SpacesPage() {
  const spaces = await listMySpacesWithTotals();

  // Patrimonio aggregato raggruppato per valuta (no conversione multi-valuta).
  const byCurrency = new Map<string, number>();
  for (const s of spaces) {
    byCurrency.set(
      s.baseCurrency,
      (byCurrency.get(s.baseCurrency) ?? 0) + s.totalBalance,
    );
  }
  const totals = [...byCurrency.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">I tuoi spazi</h1>
        <p className="text-muted-foreground">
          Vista d&apos;insieme di tutti i tuoi registri.
        </p>
      </div>

      {/* Patrimonio complessivo */}
      {totals.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="sm:col-span-1">
            <CardHeader className="pb-2">
              <CardDescription>Spazi</CardDescription>
              <CardTitle className="text-2xl">{spaces.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="sm:col-span-2">
            <CardHeader className="pb-2">
              <CardDescription>Patrimonio complessivo</CardDescription>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                {totals.map(([currency, amount]) => (
                  <CardTitle
                    key={currency}
                    className="text-2xl tabular-nums"
                  >
                    {formatMoney(money(amount, currency))}
                  </CardTitle>
                ))}
              </div>
            </CardHeader>
          </Card>
        </div>
      )}

      {spaces.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {spaces.map((s) => (
            <li key={s.id}>
              <Link href={`/${s.id}/dashboard`} className="block">
                <Card className="h-full transition-colors hover:border-foreground/30">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      <span className="truncate">{s.name}</span>
                      <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-normal text-secondary-foreground">
                        {TYPE_LABELS[s.type] ?? s.type}
                      </span>
                    </CardTitle>
                    <CardDescription className="flex items-center justify-between">
                      <span>
                        {s.accountCount}{" "}
                        {s.accountCount === 1 ? "conto" : "conti"} · {s.role}
                      </span>
                      <span className="font-mono font-medium tabular-nums text-foreground">
                        {formatMoney(money(s.totalBalance, s.baseCurrency))}
                      </span>
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">
          Non hai ancora spazi. Creane uno per iniziare.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Crea un nuovo spazio</CardTitle>
          <CardDescription>
            Decidi tu come separare personale e business.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateSpaceForm />
        </CardContent>
      </Card>
    </div>
  );
}
