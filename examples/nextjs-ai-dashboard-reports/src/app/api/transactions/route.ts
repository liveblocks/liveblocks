import { NextRequest, NextResponse } from "next/server";
import { transactions } from "../../../../src/data/transactions";
import type { Transaction } from "../../../../src/data/schema";

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
  const expenseStatus = searchParams.get("expenseStatus");
  const paymentStatus = searchParams.get("paymentStatus");
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const merchant = searchParams.get("merchant");

  let filtered = transactions;

  if (dateFrom) {
    filtered = filtered.filter(
      (t: Transaction) => new Date(t.transaction_date) >= new Date(dateFrom)
    );
  }
  if (dateTo) {
    filtered = filtered.filter(
      (t: Transaction) => new Date(t.transaction_date) <= new Date(dateTo)
    );
  }
  if (currency) {
    filtered = filtered.filter((t: Transaction) => t.currency === currency);
  }
  if (continent) {
    filtered = filtered.filter((t: Transaction) => t.continent === continent);
  }
  if (country) {
    filtered = filtered.filter((t: Transaction) => t.country === country);
  }
  if (minAmount) {
    filtered = filtered.filter(
      (t: Transaction) => t.amount >= parseFloat(minAmount)
    );
  }
  if (maxAmount) {
    filtered = filtered.filter(
      (t: Transaction) => t.amount <= parseFloat(maxAmount)
    );
  }
  if (expenseStatus) {
    filtered = filtered.filter(
      (t: Transaction) => t.expense_status === expenseStatus
    );
  }
  if (paymentStatus) {
    filtered = filtered.filter(
      (t: Transaction) => t.payment_status === paymentStatus
    );
  }
  if (merchant) {
    filtered = filtered.filter((t: Transaction) => t.merchant === merchant);
  }

  // Sort by date descending (most recent first)
  filtered = filtered.sort(
    (a: Transaction, b: Transaction) =>
      new Date(b.transaction_date).getTime() -
      new Date(a.transaction_date).getTime()
  );

  // Limit the number of results
  const result = filtered.slice(0, limit);

  return NextResponse.json({ transactions: result });
}
