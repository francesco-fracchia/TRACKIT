import Link from "next/link";
import { getSpace } from "@/server/dal/spaces";
import { listAccounts } from "@/server/dal/accounts";
import { formatMoney, money } from "@/lib/money";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function SpaceDashboardPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const [space, accounts] = await Promise.all([
    getSpace(spaceId),
    listAccounts(spaceId),
  ]);

  // Totale nella valuta base (M1: assume conti nella valuta base; la
  // conversione multi-valuta arriva con i report di M2).
  const totalCents = accounts
    .filter((a) => a.currency === space.baseCurrency)
    .reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Saldo totale ({space.baseCurrency})</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatMoney(money(totalCents, space.baseCurrency))}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conti</CardDescription>
            <CardTitle className="text-2xl">{accounts.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="flex items-center justify-center">
          <CardContent className="flex gap-2 py-6">
            <Button asChild size="sm">
              <Link href={`/${spaceId}/transactions`}>Aggiungi transazione</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/${spaceId}/accounts`}>Gestisci conti</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conti</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-muted-foreground">
              Inizia creando un conto in{" "}
              <Link
                href={`/${spaceId}/accounts`}
                className="underline underline-offset-4"
              >
                Conti
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y">
              {accounts.map((a) => (
                <li key={a.id} className="flex justify-between py-2">
                  <span>{a.name}</span>
                  <span className="font-mono tabular-nums">
                    {formatMoney(money(a.balance, a.currency))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
