import { getSpace } from "@/server/dal/spaces";
import {
  getSharingOverview,
  listSharedExpenses,
  listSettlements,
  listSpaceMembersForSplit,
} from "@/server/dal/sharing";
import { formatMoney, money } from "@/lib/money";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SharedExpenseForm } from "./shared-expense-form";
import { DeleteExpenseButton, SettleButton } from "./shared-actions";

export default async function SharedPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const today = new Date().toISOString().slice(0, 10);

  const [space, members, overview, expenses, settlements] = await Promise.all([
    getSpace(spaceId),
    listSpaceMembersForSplit(spaceId),
    getSharingOverview(spaceId),
    listSharedExpenses(spaceId),
    listSettlements(spaceId),
  ]);
  const currency = space.baseCurrency;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="space-y-6">
        <h2 className="text-lg font-semibold">Spese condivise</h2>

        {/* Saldi reciproci */}
        <div>
          <h3 className="mb-2 text-sm font-medium">Saldi</h3>
          <ul className="divide-y rounded-lg border">
            {overview.balances.map((b) => (
              <li key={b.userId} className="flex justify-between px-4 py-2 text-sm">
                <span>{b.name}</span>
                <span
                  className={`font-mono tabular-nums ${
                    b.balance > 0
                      ? "text-green-600 dark:text-green-500"
                      : b.balance < 0
                        ? "text-destructive"
                        : "text-muted-foreground"
                  }`}
                >
                  {b.balance > 0
                    ? `gli devono ${formatMoney(money(b.balance, currency))}`
                    : b.balance < 0
                      ? `deve ${formatMoney(money(-b.balance, currency))}`
                      : "in pari"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Compensazioni suggerite */}
        {overview.suggestions.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium">Compensazioni suggerite</h3>
            <ul className="space-y-2">
              {overview.suggestions.map((s, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-lg border px-4 py-2 text-sm"
                >
                  <span>
                    <strong>{s.fromName}</strong> → <strong>{s.toName}</strong>{" "}
                    {formatMoney(money(s.amount, currency))}
                  </span>
                  <SettleButton
                    spaceId={spaceId}
                    from={s.from}
                    to={s.to}
                    amount={s.amount}
                    today={today}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Spese */}
        <div>
          <h3 className="mb-2 text-sm font-medium">Spese registrate</h3>
          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessuna spesa condivisa.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {expenses.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between px-4 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{e.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.date} · pagato da {e.paidByName ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono tabular-nums">
                      {formatMoney(money(e.totalAmount, currency))}
                    </span>
                    <DeleteExpenseButton spaceId={spaceId} id={e.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Storico rimborsi */}
        {settlements.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium">Rimborsi</h3>
            <ul className="divide-y rounded-lg border text-sm">
              {settlements.map((s) => (
                <li key={s.id} className="flex justify-between px-4 py-2">
                  <span>
                    {s.fromName} → {s.toName}{" "}
                    <span className="text-muted-foreground">({s.date})</span>
                  </span>
                  <span className="font-mono tabular-nums">
                    {formatMoney(money(s.amount, currency))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <aside>
        <Card>
          <CardHeader>
            <CardTitle>Nuova spesa condivisa</CardTitle>
            <CardDescription>
              Dividi equamente, in percentuale o per importi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SharedExpenseForm
              spaceId={spaceId}
              members={members}
              today={today}
            />
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
