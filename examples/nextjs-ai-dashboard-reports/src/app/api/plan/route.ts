import { NextResponse } from "next/server";
import { currentPlan } from "@/data/data";

export async function GET() {
  return NextResponse.json(currentPlan);
}
