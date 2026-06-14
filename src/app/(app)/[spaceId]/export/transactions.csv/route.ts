import { headers } from "next/headers";
import {
  requireSpaceMember,
  UnauthorizedError,
  ForbiddenError,
} from "@/server/dal/context";
import { exportTransactions } from "@/server/dal/transactions";
import { toCsv, centsToCsvAmount } from "@/lib/csv";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import type { TransactionType } from "@/db/schema";

const TYPE_LABELS: Record<TransactionType, string> = {
  income: "Entrata",
  expense: "Uscita",
  transfer: "Trasferimento",
};

// BOM UTF-8: fa riconoscere a Excel la codifica. Usiamo l'escape (non il
// carattere letterale) per evitare "irregular whitespace" nel sorgente.
const UTF8_BOM = String.fromCharCode(0xfeff);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const { spaceId } = await params;

  try {
    const ctx = await requireSpaceMember(spaceId);
    const rows = await exportTransactions(spaceId);

    const h = await headers();
    await writeAuditLog({
      action: "data.exported",
      actorUserId: ctx.userId,
      organizationId: spaceId,
      entityType: "transaction",
      metadata: { format: "csv", count: rows.length },
      ip: getClientIp(h),
      userAgent: h.get("user-agent") ?? undefined,
    });

    const csv = toCsv(
      [
        "Data",
        "Tipo",
        "Beneficiario",
        "Categoria",
        "Conto",
        "Controparte",
        "Importo",
        "Valuta",
        "Nota",
      ],
      rows.map((r) => {
        const signed =
          r.type === "expense" || r.type === "transfer" ? -r.amount : r.amount;
        return [
          r.valueDate,
          TYPE_LABELS[r.type],
          r.payee ?? "",
          r.categoryName ?? "",
          r.accountName ?? "",
          r.counterAccountName ?? "",
          centsToCsvAmount(signed),
          r.currency,
          r.note ?? "",
        ];
      }),
    );

    return new Response(UTF8_BOM + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="transazioni.csv"`,
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
