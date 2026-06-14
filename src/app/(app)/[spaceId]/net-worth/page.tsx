import { getSpace } from "@/server/dal/spaces";
import {
  currentNetWorth,
  listLiabilities,
  listSnapshots,
} from "@/server/dal/wealth";
import { formatMoney, money } from "@/lib/money";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NetWorthChart } from "./net-worth-chart";
import {
  SnapshotButton,
  LiabilityForm,
  DeleteLiabilityButton,
} from "./net-worth-controls";

export default async function NetWorthPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const space = await getSpace(spaceId);
  const currency = space.baseCurrency;

  const [now, liabilities, snapshots] = await Promise.all([
    currentNetWorth(spaceId, currency),
    listLiabilities(spaceId),
    listSnapshots(spaceId),
  ]);

  const chartData = snapshots.map((s) => ({ date: s.date, net: s.net / 100 }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Patrimonio netto</h2>
        <SnapshotButton spaceId={spaceId} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Attività (conti)</CardDescription>
            <CardTitle className="text-xl tabular-nums text-green-600 dark:text-green-500">
              {formatMoney(money(now.assets, currency))}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Passività</CardDescription>
            <CardTitle className="text-xl tabular-nums text-destructive">
              {formatMoney(money(now.liabilities, currency))}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Patrimonio netto</CardDescription>
            <CardTitle
              className={`text-xl tabular-nums ${now.net >= 0 ? "" : "text-destructive"}`}
            >
              {formatMoney(money(now.net, currency))}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="rounded-xl border p-4">
            <h3 className="mb-3 text-sm font-medium">Storico patrimonio netto</h3>
            <NetWorthChart data={chartData} currency={currency} />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">Passività</h3>
            {liabilities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nessuna passività registrata.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {liabilities.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between px-4 py-2"
                  >
                    <span>{l.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono tabular-nums text-destructive">
                        {formatMoney(money(l.balance, currency))}
                      </span>
                      <DeleteLiabilityButton spaceId={spaceId} id={l.id} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside>
          <Card>
            <CardHeader>
              <CardTitle>Nuova passività</CardTitle>
              <CardDescription>Mutuo, prestito, debiti…</CardDescription>
            </CardHeader>
            <CardContent>
              <LiabilityForm spaceId={spaceId} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
