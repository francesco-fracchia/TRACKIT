import { getSpace } from "@/server/dal/spaces";
import { listAccountOptions } from "@/server/dal/accounts";
import { listGoals } from "@/server/dal/wealth";
import { formatMoney, money } from "@/lib/money";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GoalForm } from "./goal-form";
import { GoalControls } from "./goal-controls";

export default async function GoalsPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const [space, accounts, goals] = await Promise.all([
    getSpace(spaceId),
    listAccountOptions(spaceId),
    listGoals(spaceId),
  ]);
  const currency = space.baseCurrency;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Obiettivi di risparmio</h2>
        {goals.length === 0 ? (
          <p className="text-muted-foreground">
            Nessun obiettivo. Creane uno dal pannello a destra.
          </p>
        ) : (
          <ul className="space-y-3">
            {goals.map((g) => (
              <li key={g.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {g.name}{" "}
                    {g.reached && (
                      <span className="text-xs text-green-600 dark:text-green-500">
                        ✓ raggiunto
                      </span>
                    )}
                  </span>
                  <GoalControls spaceId={spaceId} goalId={g.id} manual={g.manual} />
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-green-600"
                    style={{ width: `${g.percent}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatMoney(money(g.current, currency))} /{" "}
                  {formatMoney(money(g.target, currency))} ({g.percent}%)
                  {g.linkedAccountName && ` · conto: ${g.linkedAccountName}`}
                  {g.targetDate && ` · entro ${g.targetDate}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside>
        <Card>
          <CardHeader>
            <CardTitle>Nuovo obiettivo</CardTitle>
            <CardDescription>
              Collega un conto o aggiorna l&apos;importo a mano.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GoalForm
              spaceId={spaceId}
              accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
            />
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
