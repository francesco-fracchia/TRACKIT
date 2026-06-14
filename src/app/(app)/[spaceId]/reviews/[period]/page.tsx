import Link from "next/link";
import { getReview } from "@/server/dal/reviews";
import { getSpace } from "@/server/dal/spaces";
import { listSpaceMembersForSplit } from "@/server/dal/sharing";
import { formatMoney, money } from "@/lib/money";
import { monthLabel } from "@/lib/period";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  NotesEditor,
  ActionItems,
  CloseReopenButton,
} from "./review-detail";

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ spaceId: string; period: string }>;
}) {
  const { spaceId, period } = await params;
  const [space, review, members] = await Promise.all([
    getSpace(spaceId),
    getReview(spaceId, period),
    listSpaceMembersForSplit(spaceId),
  ]);
  const currency = space.baseCurrency;

  if (!review) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <p className="text-muted-foreground">
          Nessuna revisione per questo periodo.
        </p>
        <Button asChild variant="outline">
          <Link href={`/${spaceId}/reviews`}>Torna alle revisioni</Link>
        </Button>
      </div>
    );
  }

  const [y, m] = period.split("-").map(Number);
  const d = review.data;
  const closed = review.status === "closed";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/${spaceId}/reviews`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Revisioni
          </Link>
          <h2 className="text-xl font-bold tracking-tight">
            {monthLabel(y ?? 0, m ?? 1)}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({closed ? "chiusa" : "in corso"})
            </span>
          </h2>
        </div>
        <CloseReopenButton spaceId={spaceId} period={period} status={review.status} />
      </div>

      {/* Numeri del mese */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Entrate</CardDescription>
            <CardTitle className="text-xl tabular-nums text-green-600 dark:text-green-500">
              {formatMoney(money(d.income, currency))}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Uscite</CardDescription>
            <CardTitle className="text-xl tabular-nums text-destructive">
              {formatMoney(money(d.expense, currency))}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Saldo del mese</CardDescription>
            <CardTitle
              className={`text-xl tabular-nums ${d.net >= 0 ? "text-green-600 dark:text-green-500" : "text-destructive"}`}
            >
              {formatMoney(money(d.net, currency))}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Da sistemare */}
      {d.uncategorizedCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Da sistemare</CardTitle>
            <CardDescription>
              {d.uncategorizedCount} transazioni senza categoria.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href={`/${spaceId}/transactions`}>Vai alle transazioni</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Scostamenti budget */}
      {d.budgetLines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Budget vs reale</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {d.budgetLines.map((b, i) => (
                <li key={i} className="flex justify-between py-1.5">
                  <span>{b.categoryName ?? "—"}</span>
                  <span
                    className={`font-mono tabular-nums ${b.over ? "text-destructive" : ""}`}
                  >
                    {formatMoney(money(b.spent, currency))} /{" "}
                    {formatMoney(money(b.budgeted, currency))}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Obiettivi */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Obiettivi</CardDescription>
          <CardTitle className="text-base">
            {d.goals.reached}/{d.goals.total} raggiunti
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Note */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Note</CardTitle>
        </CardHeader>
        <CardContent>
          <NotesEditor
            spaceId={spaceId}
            reviewId={review.id}
            period={period}
            initial={review.notes ?? ""}
            disabled={closed}
          />
        </CardContent>
      </Card>

      {/* Action item */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Propositi per il mese prossimo</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionItems
            spaceId={spaceId}
            reviewId={review.id}
            period={period}
            items={review.actionItems}
            members={members}
            disabled={closed}
          />
        </CardContent>
      </Card>
    </div>
  );
}
