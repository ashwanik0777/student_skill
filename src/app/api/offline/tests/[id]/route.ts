import { NextResponse } from "next/server";
import { getOfflinePackage } from "@/lib/services/tests";
import { getApiUser } from "@/lib/session";

/** Downloadable test package (questions without the answer key). */
export async function GET(_request: Request, ctx: RouteContext<"/api/offline/tests/[id]">) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const pkg = await getOfflinePackage(user.id, id);
  if (!pkg) return NextResponse.json({ error: "Test not available offline" }, { status: 404 });
  return NextResponse.json(pkg, { headers: { "Cache-Control": "private, no-store" } });
}
