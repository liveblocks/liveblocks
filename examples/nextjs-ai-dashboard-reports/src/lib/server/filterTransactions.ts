import type { Transaction } from "@/data/schema";
import { transactions } from "@/data/transactions";

export type TransactionFilterArgs = {
  dateFrom?: string;
  dateTo?: string;
  currency?: string;
  continent?: string;
  country?: string;
  minAmount?: number;
  maxAmount?: number;
  expenseStatus?: string;
  paymentStatus?: string;
  limit?: number;
  merchant?: string;
};

export function filterTransactions({
  dateFrom,
  dateTo,
  currency,
  continent,
  country,
  minAmount,
  maxAmount,
  expenseStatus,
  paymentStatus,
  limit = 20,
  merchant,
}: TransactionFilterArgs): Transaction[] {
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
  if (minAmount !== undefined) {
    filtered = filtered.filter((t: Transaction) => t.amount >= minAmount);
  }
  if (maxAmount !== undefined) {
    filtered = filtered.filter((t: Transaction) => t.amount <= maxAmount);
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

  filtered = filtered.sort(
    (a: Transaction, b: Transaction) =>
      new Date(b.transaction_date).getTime() -
      new Date(a.transaction_date).getTime()
  );

  return filtered.slice(0, limit);
}
