import { NextRequest, NextResponse } from "next/server";
import { currentPlan } from "@/data/data";

export async function GET(req: NextRequest) {
  return NextResponse.json(currentPlan);
}
