import { NextRequest, NextResponse } from "next/server";
import { getTenants } from "../../../database";

/**
 * Get tenants
 */

export async function GET(request: NextRequest) {
  const tenants = await getTenants();

  return NextResponse.json(tenants);
}
