import { NextRequest, NextResponse } from "next/server";
import { requireConsoleStaff } from "@/lib/console/server";

export const dynamic = "force-dynamic";

/** 200 with the staff member when the caller is active Kayd staff, else 403. */
export async function GET(request: NextRequest) {
  const staff = await requireConsoleStaff(request);
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ staff });
}
