import Link from "next/link";
import { listReviews } from "@/server/dal/reviews";
import { currentYearMonth, monthLabel } from "@/lib/period";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OpenReviewButton } from "./open-review-button";

export default async function ReviewsPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const reviews = await listReviews(spaceId);
  const { year, month } = currentYearMonth(new Date());
  const currentPeriod = `${year}-${String(month).padStart(2, "0")}`;
  const hasCurrent = reviews.some((r) => r.period === currentPeriod);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Revisione mensile</h2>
        <p className="text-sm text-muted-foreground">
          Il momento per fare il punto: numeri del mese, scostamenti, cosa
          sistemare e i propositi per il mese dopo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{monthLabel(year, month)}</CardTitle>
          <CardDescription>
            {hasCurrent
              ? "Revisione del mese corrente già avviata."
              : "Avvia la revisione del mese corrente."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OpenReviewButton
            spaceId={spaceId}
            period={currentPeriod}
            label={hasCurrent ? "Continua la revisione" : "Apri la revisione"}
          />
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-2 text-sm font-medium">Storico</h3>
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nessuna revisione ancora.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {reviews.map((r) => {
              const [y, m] = r.period.split("-").map(Number);
              return (
                <li key={r.period}>
                  <Link
                    href={`/${spaceId}/reviews/${r.period}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-accent"
                  >
                    <span>{monthLabel(y ?? 0, m ?? 1)}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        r.status === "closed"
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      {r.status === "closed" ? "chiusa" : "in corso"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
