import type { Transaction } from "../data/schema";

export type TransactionQueryParams = {
  dateFrom?: string;
  dateTo?: string;
  currency?: Transaction["currency"];
  continent?: Transaction["continent"];
  country?: Transaction["country"];
  minAmount?: Transaction["amount"];
  maxAmount?: Transaction["amount"];
  expenseStatus?: Transaction["expense_status"];
  paymentStatus?: Transaction["payment_status"];
  limit?: number;
  merchant?: Transaction["merchant"];
};

export type TransactionResponse = {
  transactions: Transaction[];
};

export async function fetchTransactions(
  params: TransactionQueryParams
): Promise<TransactionResponse> {
  const url = new URL("/api/transactions", window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch transactions: ${res.status}`);
  }
  return res.json();
}
