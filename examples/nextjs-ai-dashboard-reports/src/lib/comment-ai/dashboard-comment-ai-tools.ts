import { getUser } from "@/app/api/database";
import { filterInvoices } from "@/lib/server/filterInvoices";
import { filterTransactions } from "@/lib/server/filterTransactions";
import { transactions } from "@/data/transactions";
import { tool } from "ai";
import { z } from "zod";

const nullableString = z.string().nullable();
const nullableNumber = z.number().nullable();

export function createDashboardCommentAiTools() {
  return {
    "query-transaction": tool({
      description: `Query transaction rows from this app's demo dataset (same intent as the dashboard copilot).
Filters combine with AND. Use correct ISO dates where helpful.`,
      inputSchema: z.object({
        dateFrom: nullableString,
        dateTo: nullableString,
        currency: nullableString,
        continent: nullableString,
        country: nullableString,
        minAmount: nullableNumber,
        maxAmount: nullableNumber,
        expenseStatus: nullableString,
        paymentStatus: nullableString,
        limit: nullableNumber,
        merchant: nullableString,
      }),
      execute: async (args) => {
        const txs = filterTransactions({
          dateFrom: args.dateFrom ?? undefined,
          dateTo: args.dateTo ?? undefined,
          currency: args.currency ?? undefined,
          continent: args.continent ?? undefined,
          country: args.country ?? undefined,
          minAmount: args.minAmount ?? undefined,
          maxAmount: args.maxAmount ?? undefined,
          expenseStatus: args.expenseStatus ?? undefined,
          paymentStatus: args.paymentStatus ?? undefined,
          limit: args.limit ?? 20,
          merchant: args.merchant ?? undefined,
        });
        return { transactions: txs };
      },
    }),

    "query-invoice": tool({
      description:
        "Query invoice rows from this app's demo dataset (same intent as the dashboard copilot).",
      inputSchema: z.object({
        dateFrom: nullableString,
        dateTo: nullableString,
        currency: nullableString,
        continent: nullableString,
        country: nullableString,
        minAmount: nullableNumber,
        maxAmount: nullableNumber,
        invoiceStatus: nullableString,
        limit: nullableNumber,
        client: nullableString,
      }),
      execute: async (args) => {
        const inv = filterInvoices({
          dateFrom: args.dateFrom ?? undefined,
          dateTo: args.dateTo ?? undefined,
          currency: args.currency ?? undefined,
          continent: args.continent ?? undefined,
          country: args.country ?? undefined,
          minAmount: args.minAmount ?? undefined,
          maxAmount: args.maxAmount ?? undefined,
          invoiceStatus: args.invoiceStatus ?? undefined,
          limit: args.limit ?? 20,
          client: args.client ?? undefined,
        });
        return { invoices: inv };
      },
    }),

    transaction: tool({
      description:
        "Fetch one transaction by transaction_id from the demo dataset (structured JSON; no UI card).",
      inputSchema: z.object({
        transactionId: z.string(),
      }),
      execute: async ({ transactionId }) => {
        const row = transactions.find((t) => t.transaction_id === transactionId);
        return row ? { transaction: row } : { error: "Transaction not found" };
      },
    }),

    member: tool({
      description:
        "Look up a team member by email from the demo user directory (same intent as the member card tool).",
      inputSchema: z.object({
        email: z.string(),
      }),
      execute: async ({ email }) => {
        const user = getUser(email);
        return user
          ? {
              id: user.id,
              name: user.info.name,
              avatar: user.info.avatar,
              color: user.info.color,
            }
          : { error: "User not found" };
      },
    }),
  };
}
