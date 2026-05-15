import { NextResponse } from "next/server";
import { getDashboardPlanKnowledge } from "@/lib/dashboard-ai-knowledge";

export async function GET() {
  return NextResponse.json(getDashboardPlanKnowledge());
}
