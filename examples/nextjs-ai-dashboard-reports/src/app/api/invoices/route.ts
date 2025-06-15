import { NextRequest, NextResponse } from "next/server";
import { invoices } from "@/data/invoices";
import type { Invoice } from "@/data/schema";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  // Parse filters from query params
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const currency = searchParams.get("currency");
  const continent = searchParams.get("continent");
  const country = searchParams.get("country");
  const minAmount = searchParams.get("minAmount");
  const maxAmount = searchParams.get("maxAmount");
  const invoiceStatus = searchParams.get("invoiceStatus");
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  let filtered = invoices;

  if (dateFrom) {
    filtered = filtered.filter(
      (i: Invoice) => new Date(i.invoice_date) >= new Date(dateFrom)
    );
  }
  if (dateTo) {
    filtered = filtered.filter(
      (i: Invoice) => new Date(i.invoice_date) <= new Date(dateTo)
    );
  }
  if (currency) {
    filtered = filtered.filter((i: Invoice) => i.currency === currency);
  }
  if (continent) {
    filtered = filtered.filter((i: Invoice) => i.continent === continent);
  }
  if (country) {
    filtered = filtered.filter((i: Invoice) => i.country === country);
  }
  if (minAmount) {
    filtered = filtered.filter(
      (i: Invoice) => i.amount >= parseFloat(minAmount)
    );
  }
  if (maxAmount) {
    filtered = filtered.filter(
      (i: Invoice) => i.amount <= parseFloat(maxAmount)
    );
  }
  if (invoiceStatus) {
    filtered = filtered.filter(
      (i: Invoice) => i.invoice_status === invoiceStatus
    );
  }

  // Sort by date descending (most recent first)
  filtered = filtered.sort(
    (a: Invoice, b: Invoice) =>
      new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime()
  );

  // Limit the number of results
  const result = filtered.slice(0, limit);

  return NextResponse.json({ invoices: result });
}
