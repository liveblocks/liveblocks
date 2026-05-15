import { NextRequest, NextResponse } from "next/server";
import { filterInvoices } from "@/lib/server/filterInvoices";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const dateFrom = searchParams.get("dateFrom") ?? undefined;
  const dateTo = searchParams.get("dateTo") ?? undefined;
  const currency = searchParams.get("currency") ?? undefined;
  const continent = searchParams.get("continent") ?? undefined;
  const country = searchParams.get("country") ?? undefined;
  const minAmount = searchParams.get("minAmount");
  const maxAmount = searchParams.get("maxAmount");
  const invoiceStatus = searchParams.get("invoiceStatus") ?? undefined;
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const client = searchParams.get("client") ?? undefined;

  const result = filterInvoices({
    dateFrom,
    dateTo,
    currency,
    continent,
    country,
    minAmount: minAmount ? parseFloat(minAmount) : undefined,
    maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
    invoiceStatus,
    limit,
    client,
  });

  return NextResponse.json({ invoices: result });
}
