import { getSpace } from "@/server/dal/spaces";
import { listAccounts } from "@/server/dal/accounts";
import { projectionMovements } from "@/server/dal/recurring";
import { currentYearMonth } from "@/lib/period";
import { ProjectionsView } from "./projections-view";

function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days))
    .toISOString()
    .slice(0, 10);
}

export default async function ProjectionsPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const today = new Date().toISOString().slice(0, 10);
  const { year, month } = currentYearMonth(new Date());

  const [space, accounts, movements] = await Promise.all([
    getSpace(spaceId),
    listAccounts(spaceId),
    projectionMovements(spaceId, today, addDays(today, 400)),
  ]);

  const currency = space.baseCurrency;
  const startBalance = accounts
    .filter((a) => a.currency === currency)
    .reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Proiezioni</h2>
        <p className="text-sm text-muted-foreground">
          Saldo previsto sui prossimi 12 mesi in base alle ricorrenze. Prova uno
          scenario &quot;cosa succede se&quot; aggiungendo un importo mensile.
        </p>
      </div>
      <ProjectionsView
        startBalance={startBalance}
        movements={movements}
        fromYear={year}
        fromMonth={month}
        currency={currency}
      />
    </div>
  );
}
