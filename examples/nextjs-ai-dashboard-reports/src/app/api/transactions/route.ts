import { NextRequest, NextResponse } from "next/server";
import { filterTransactions } from "@/lib/server/filterTransactions";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const dateFrom = searchParams.get("dateFrom") ?? undefined;
  const dateTo = searchParams.get("dateTo") ?? undefined;
  const currency = searchParams.get("currency") ?? undefined;
  const continent = searchParams.get("continent") ?? undefined;
  const country = searchParams.get("country") ?? undefined;
  const minAmount = searchParams.get("minAmount");
  const maxAmount = searchParams.get("maxAmount");
  const expenseStatus = searchParams.get("expenseStatus") ?? undefined;
  const paymentStatus = searchParams.get("paymentStatus") ?? undefined;
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const merchant = searchParams.get("merchant") ?? undefined;

  const result = filterTransactions({
    dateFrom,
    dateTo,
    currency,
    continent,
    country,
    minAmount: minAmount ? parseFloat(minAmount) : undefined,
    maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
    expenseStatus,
    paymentStatus,
    limit,
    merchant,
  });

  return NextResponse.json({ transactions: result });
}
