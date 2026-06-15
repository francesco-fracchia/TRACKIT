import {
  Landmark,
  Wallet,
  CreditCard,
  Smartphone,
  PiggyBank,
  type LucideIcon,
} from "lucide-react";
import { listAccounts } from "@/server/dal/accounts";
import { getSpace } from "@/server/dal/spaces";
import { formatMoney, money } from "@/lib/money";
import type { AccountType } from "@/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateAccountForm } from "./create-account-form";

const TYPE_LABELS: Record<AccountType, string> = {
  bank: "Banca",
  cash: "Contanti",
  card: "Carta",
  ewallet: "E-wallet",
  other: "Altro",
};

const TYPE_ICONS: Record<AccountType, LucideIcon> = {
  bank: Landmark,
  cash: Wallet,
  card: CreditCard,
  ewallet: Smartphone,
  other: PiggyBank,
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

  const currency = space.baseCurrency;
  const total = accounts
    .filter((a) => a.currency === currency)
    .reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Conti</h2>
          {accounts.length > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Saldo totale</p>
              <p
                className={`font-mono text-lg font-semibold tabular-nums ${total < 0 ? "text-destructive" : ""}`}
              >
                {formatMoney(money(total, currency))}
              </p>
            </div>
          )}
        </div>

        {accounts.length === 0 ? (
          <p className="text-muted-foreground">
            Nessun conto. Aggiungine uno per iniziare a registrare transazioni.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {accounts.map((a) => {
              const Icon = TYPE_ICONS[a.type] ?? PiggyBank;
              const negative = a.balance < 0;
              return (
                <li key={a.id}>
                  <Card className="h-full">
                    <CardContent className="flex h-full flex-col gap-3 p-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <Icon className="size-5" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{a.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {TYPE_LABELS[a.type] ?? a.type} · {a.currency}
                          </p>
                        </div>
                      </div>
                      <p
                        className={`mt-auto font-mono text-2xl font-semibold tabular-nums ${negative ? "text-destructive" : ""}`}
                      >
                        {formatMoney(money(a.balance, a.currency))}
                      </p>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
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
