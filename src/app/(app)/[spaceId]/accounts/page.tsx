import { listAccounts } from "@/server/dal/accounts";
import { getSpace } from "@/server/dal/spaces";
import { formatMoney, money } from "@/lib/money";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateAccountForm } from "./create-account-form";

const TYPE_LABELS: Record<string, string> = {
  bank: "Banca",
  cash: "Contanti",
  card: "Carta",
  ewallet: "E-wallet",
  other: "Altro",
};

export default async function AccountsPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const [space, accounts] = await Promise.all([
    getSpace(spaceId),
    listAccounts(spaceId),
  ]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Conti</h2>
        {accounts.length === 0 ? (
          <p className="text-muted-foreground">
            Nessun conto. Aggiungine uno per iniziare a registrare transazioni.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {accounts.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {TYPE_LABELS[a.type] ?? a.type} · {a.currency}
                  </p>
                </div>
                <span className="font-mono tabular-nums">
                  {formatMoney(money(a.balance, a.currency))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside>
        <Card>
          <CardHeader>
            <CardTitle>Nuovo conto</CardTitle>
            <CardDescription>Banca, contanti, carta, e-wallet…</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateAccountForm spaceId={spaceId} baseCurrency={space.baseCurrency} />
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
