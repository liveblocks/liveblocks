// Get tenant info

import { NextRequest, NextResponse } from "next/server";
import { getTenant } from "../../../../database";

export async function GET(
  _request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  const tenant = await getTenant(params.tenantId);

  return NextResponse.json(tenant);
}
