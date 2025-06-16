import type { Invoice } from "../data/schema";

export type InvoiceQueryParams = {
  dateFrom?: string;
  dateTo?: string;
  currency?: Invoice["currency"];
  continent?: Invoice["continent"];
  country?: Invoice["country"];
  minAmount?: Invoice["amount"];
  maxAmount?: Invoice["amount"];
  invoiceStatus?: Invoice["invoice_status"];
  limit?: number;
  client?: Invoice["client"];
};

export type InvoiceResponse = {
  invoices: Invoice[];
};

export async function fetchInvoices(
  params: InvoiceQueryParams
): Promise<InvoiceResponse> {
  const url = new URL("/api/invoices", window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch invoices: ${res.status}`);
  }
  return res.json();
}
