import { headers } from "next/headers";
import {
  requireSpaceMember,
  UnauthorizedError,
  ForbiddenError,
} from "@/server/dal/context";
import { getSpace } from "@/server/dal/spaces";
import { incomeVsExpense, spentByCategory } from "@/server/dal/analytics";
import { renderReport } from "@/server/reports/report-document";
import { currentYearMonth, monthLabel, monthRange } from "@/lib/period";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/request";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const { spaceId } = await params;

  try {
    const ctx = await requireSpaceMember(spaceId);
    const { year, month } = currentYearMonth(new Date());
    const range = monthRange(year, month);

    const [space, ie, byCat] = await Promise.all([
      getSpace(spaceId),
      incomeVsExpense(spaceId, range.from, range.to),
      spentByCategory(spaceId, range.from, range.to),
    ]);

    const pdf = await renderReport({
      spaceName: space.name,
      periodLabel: monthLabel(year, month),
      currency: space.baseCurrency,
      income: ie.income,
      expense: ie.expense,
      categories: byCat
        .filter((c) => c.spent > 0)
        .map((c) => ({ name: c.categoryName ?? "Senza categoria", spent: c.spent })),
    });

    const h = await headers();
    await writeAuditLog({
      action: "data.exported",
      actorUserId: ctx.userId,
      organizationId: spaceId,
      entityType: "report",
      metadata: { format: "pdf", period: `${year}-${month}` },
      ip: getClientIp(h),
      userAgent: h.get("user-agent") ?? undefined,
    });

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report-${year}-${String(month).padStart(2, "0")}.pdf"`,
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError)
      return new Response("Non autenticato", { status: 401 });
    if (err instanceof ForbiddenError)
      return new Response("Accesso negato", { status: 403 });
    throw err;
  }
}
