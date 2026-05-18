import type { Invoice } from "@/data/schema";
import { invoices } from "@/data/invoices";

export type InvoiceFilterArgs = {
  dateFrom?: string;
  dateTo?: string;
  currency?: string;
  continent?: string;
  country?: string;
  minAmount?: number;
  maxAmount?: number;
  invoiceStatus?: string;
  limit?: number;
  client?: string;
};

export function filterInvoices({
  dateFrom,
  dateTo,
  currency,
  continent,
  country,
  minAmount,
  maxAmount,
  invoiceStatus,
  limit = 20,
  client,
}: InvoiceFilterArgs): Invoice[] {
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
  if (minAmount !== undefined) {
    filtered = filtered.filter((i: Invoice) => i.amount >= minAmount);
  }
  if (maxAmount !== undefined) {
    filtered = filtered.filter((i: Invoice) => i.amount <= maxAmount);
  }
  if (invoiceStatus) {
    filtered = filtered.filter(
      (i: Invoice) => i.invoice_status === invoiceStatus
    );
  }
  if (client) {
    filtered = filtered.filter((i: Invoice) => i.client === client);
  }

  filtered = filtered.sort(
    (a: Invoice, b: Invoice) =>
      new Date(b.invoice_date).getTime() -
      new Date(a.invoice_date).getTime()
  );

  return filtered.slice(0, limit);
}
