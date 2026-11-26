import { NextRequest, NextResponse } from "next/server";
import { amountGrantUntil, logKaydAccess, requireConsoleStaff } from "@/lib/console/server";
import { loadActivity, parseActivityFilters } from "@/lib/console/queries";
import { csvCell } from "@/lib/console/activity";
import { formatDateTime } from "@/lib/console/format";

export const dynamic = "force-dynamic";

/**
 * CSV of the filtered activity log. Amounts are included only when one
 * organisation is selected and the caller has an unexpired break-glass grant
 * for it. Every export is logged.
 */
export async function GET(request: NextRequest) {
  const staff = await requireConsoleStaff(request);
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const filters = parseActivityFilters(request.nextUrl.searchParams);
  const showAmounts = filters.org ? Boolean(await amountGrantUntil(staff.id, filters.org)) : false;
  const lines = await loadActivity(filters, showAmounts, 5000);

  await logKaydAccess(staff, {
    organisationId: filters.org,
    action: "exported",
    reason: showAmounts ? "Export included amounts" : "Export without amounts",
  });

  const header = ["When", "Organisation", "Person", "Action", "Details", ...(showAmounts ? ["Amount"] : [])];
  const rows = lines.map((l) => [
    formatDateTime(l.createdAt),
    l.organisationName,
    l.actorName,
    l.label,
    l.detail,
    ...(showAmounts ? [l.amount ?? ""] : []),
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kayd-activity-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
