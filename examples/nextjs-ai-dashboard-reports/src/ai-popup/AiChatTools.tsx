import React from "react";
import { Badge } from "@/components/Badge";
import { transactions } from "@/data/transactions";
import { format } from "date-fns";
import {
  expense_statuses,
  payment_statuses,
  locations,
  currencies,
  categories,
  merchants,
} from "@/data/schema";
import { users } from "@/data/users";
import Image from "next/image";
import { defineAiTool } from "@liveblocks/client";
import { useRouter } from "next/navigation";
import { AiTool } from "@liveblocks/react-ui";
import { Timestamp } from "@liveblocks/react-ui/primitives";
import { toast } from "sonner";
import { RegisterAiTool } from "@liveblocks/react";
import { ChevronDownIcon } from "lucide-react";
import { formatters } from "@/lib/utils";
import useSWR from "swr";
import { fetchTransactions } from "@/lib/transactionsApi";
import { fetchInvoices } from "@/lib/invoicesApi";
import { ProgressBar } from "../components/ProgressBar";

export function SeatsTool() {
  return (
    <RegisterAiTool
      name="seats"
      tool={defineAiTool()({
        description:
          "Show a visual of the remaining seats. Place in the current seat limit and seats used.",
        parameters: {
          type: "object",
          properties: {
            seatsLimit: { type: "number" },
            seatsUsed: { type: "number" },
          },
          required: ["seatsLimit", "seatsUsed"],
          additionalProperties: false,
        },
        execute: () => {},
        render: ({ args }) => {
          if (!args) return null;

          return (
            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 pt-4.5">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                Remaining seats
              </p>
              <ProgressBar
                value={(args.seatsUsed / args.seatsLimit) * 100 || 0}
                className="mt-2"
              />
              <div className="mt-3 flex items-center justify-between">
                <p className="flex items-center space-x-2">
                  <span className="rounded-lg bg-gray-200 dark:bg-gray-800 px-2 py-1 text-xs font-medium text-gray-900  dark:text-gray-50">
                    {args.seatsUsed}
                  </span>{" "}
                  <span className="text-sm text-gray-500 dark:text-gray-500">
                    of {args.seatsLimit} seats used
                  </span>
                </p>
              </div>
            </div>
          );
        },
      })}
    />
  );
}

export function QueryTransactionTool() {
  return (
    <RegisterAiTool
      name="query-transaction"
      tool={defineAiTool()({
        description: `Query the transaction details. 
        You can query by date, currency, continent, country, min amount, max amount, expense status, payment status, and limit. 
        You can also query by multiple of these parameters. 
        Here are some types you should know.
        
        expenseStatus: ${JSON.stringify(expense_statuses)}
        paymentStatus: ${JSON.stringify(payment_statuses)}
        locations: ${JSON.stringify(locations)}
        currencies: ${JSON.stringify(currencies)}
        categories: ${JSON.stringify(categories)}
        merchants: ${JSON.stringify(merchants)}
        `,
        parameters: {
          type: "object",
          properties: {
            dateFrom: { type: ["string", "null"] },
            dateTo: { type: ["string", "null"] },
            currency: { type: ["string", "null"] },
            continent: { type: ["string", "null"] },
            country: { type: ["string", "null"] },
            minAmount: { type: ["number", "null"] },
            maxAmount: { type: ["number", "null"] },
            expenseStatus: { type: ["string", "null"] },
            paymentStatus: { type: ["string", "null"] },
            limit: { type: ["number", "null"] },
          },
          required: [
            "dateFrom",
            "dateTo",
            "currency",
            "continent",
            "country",
            "minAmount",
            "maxAmount",
            "expenseStatus",
            "paymentStatus",
            "limit",
          ],
        },
        execute: async (args) => {
          // OpenAI forces `required` therefore we're using `null` instead, then removing it here
          const { transactions } = await fetchTransactions(
            Object.fromEntries(
              Object.entries(args).map(([key, value]) => [
                key,
                value === null ? undefined : value,
              ])
            )
          );
          return {
            data: {
              transactions,
            },
          };
        },
        render: ({ args }) =>
          args ? <AiTool title="Transaction query" /> : null,
      })}
    />
  );
}

export function QueryInvoiceTool() {
  return (
    <RegisterAiTool
      name="query-invoice"
      tool={defineAiTool()({
        description: "Query the invoice details",
        parameters: {
          type: "object",
          properties: {
            dateFrom: { type: ["string", "null"] },
            dateTo: { type: ["string", "null"] },
            currency: { type: ["string", "null"] },
            continent: { type: ["string", "null"] },
            country: { type: ["string", "null"] },
            minAmount: { type: ["number", "null"] },
            maxAmount: { type: ["number", "null"] },
            invoiceStatus: { type: ["string", "null"] },
            limit: { type: ["number", "null"] },
          },
          required: [
            "dateFrom",
            "dateTo",
            "currency",
            "continent",
            "country",
            "minAmount",
            "maxAmount",
            "invoiceStatus",
            "limit",
          ],
        },
        execute: async (args) => {
          // OpenAI forces `required` therefore we're using `null` instead, then removing it here
          const { invoices } = await fetchInvoices(
            Object.fromEntries(
              Object.entries(args).map(([key, value]) => [
                key,
                value == null ? undefined : value,
              ])
            )
          );
          return {
            data: {
              invoices,
            },
          };
        },
        render: ({ args }) =>
          args ? (
            <AiTool title="Invoice query" collapsed={true}>
              <AiTool.Inspector />
            </AiTool>
          ) : null,
      })}
    />
  );
}

export function NavigateToPageTool() {
  const router = useRouter();

  return (
    <RegisterAiTool
      name="navigate-to-page"
      tool={defineAiTool()({
        description:
          "Redirect the user to a page. Only navigate if the user has directly asked you to do it. Never assume they want to. Just say you've found the page, or you can't find it, then do it.",
        parameters: {
          type: "object",
          properties: {
            relativeUrl: { type: "string" },
          },
          additionalProperties: false,
          required: ["relativeUrl"],
        },
        execute: ({ relativeUrl }) => {
          router.push(relativeUrl);
          toast(`Redirecting to ${relativeUrl}...`, {
            action: {
              label: "Go back",
              onClick: () => router.back(),
            },
          });
          return {
            description:
              "Redirected the user to the page. Do not write anything else.",
            data: {},
          };
        },
        render: ({ args }) =>
          args ? <AiTool title={`Redirected to ${args.relativeUrl}`} /> : null,
      })}
    />
  );
}

export function SendInvoiceRemindersTool() {
  return (
    <RegisterAiTool
      name="send-invoice-reminders"
      tool={defineAiTool()({
        description: "Send invoice reminders for unpaid invoices.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: [],
        },

        render: function Render({ stage }) {
          const {
            data: unpaidInvoices,
            isLoading: isLoadingUnpaid,
            error: errorUnpaid,
          } = useSWR(
            "unpaid-invoices",
            async () => {
              const response = await fetchInvoices({
                invoiceStatus: "unpaid",
              });
              return response.invoices;
            },
            {
              refreshInterval: 20000,
            }
          );

          // Group invoices by company, attaching full invoice objects
          const clients =
            unpaidInvoices?.reduce((acc: any[], invoice) => {
              const existingCompany = acc.find(
                (c) => c.name === invoice.client
              );
              if (existingCompany) {
                existingCompany.invoices.push(invoice);
              } else {
                acc.push({
                  name: invoice.client,
                  invoices: [invoice],
                });
              }
              return acc;
            }, []) || [];

          if (!clients) return null;

          return (
            <AiTool
              title="Send invoice reminders"
              collapsed={stage === "executed"}
            >
              <AiTool.Confirmation
                confirm={async () => {
                  // Simulating sending emails
                  const promise = () =>
                    new Promise((resolve) => setTimeout(resolve, 2500));

                  toast.promise(promise, {
                    loading: "Sending invoice reminders...",
                    success: () => {
                      return `Invoice reminders sent`;
                    },
                  });

                  await promise;
                  return {
                    description: "Invoice reminders sent",
                    data: {},
                  };
                }}
              >
                {isLoadingUnpaid && (
                  <div className="text-xs text-gray-500">
                    Loading invoice details...
                  </div>
                )}
                {errorUnpaid && (
                  <div className="text-xs text-red-500 font-semibold">
                    Error
                  </div>
                )}
                {!isLoadingUnpaid && !errorUnpaid && (
                  <ul className="flex flex-col gap-2">
                    {clients.map((client) => (
                      <li
                        key={
                          client.name +
                          client.invoices
                            .map((inv: any) => inv.invoice_id)
                            .join(",")
                        }
                      >
                        <details className="group">
                          <summary className="cursor-pointer flex items-center justify-between select-none">
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-semibold">
                                {client.name}
                              </span>

                              <span className="text-xs font-normal text-gray-500">
                                {client.invoices.length} unpaid
                              </span>
                            </div>
                            <ChevronDownIcon className="size-4 opacity-70 group-open:rotate-180 transition-transform mt-0.5" />
                          </summary>
                          <ul className="text-xs text-gray-500 mt-1">
                            {client.invoices.map((invoice: any) => (
                              <li
                                key={invoice.invoice_id}
                                className="mb-2 mt-1.5 ml-3.5 list-disc"
                              >
                                <div>
                                  {formatters.currency({
                                    number: invoice.amount,
                                  })}
                                  , due <Timestamp date={invoice.due_date} />
                                </div>
                              </li>
                            ))}
                          </ul>
                        </details>
                      </li>
                    ))}
                  </ul>
                )}
              </AiTool.Confirmation>
            </AiTool>
          );
        },
      })}
    />
  );
}

export function InviteMemberTool({
  onInvite,
}: {
  onInvite: ({ name, email }: { name: string; email: string }) => void;
}) {
  return (
    <RegisterAiTool
      name="invite-member"
      tool={defineAiTool()({
        description:
          "Invite a new member to the team. Always ask for an email address. If they don't provide a name, guess what it is from the email.",
        parameters: {
          type: "object",
          properties: {
            email: { type: "string" },
            name: { type: "string" },
          },
          additionalProperties: false,
          required: ["email", "name"],
        },
        render: ({ args, stage }) => {
          if (!args) return null;

          return (
            <AiTool title="Invite member" collapsed={stage === "executed"}>
              <AiTool.Confirmation
                confirm={() => {
                  toast.success(`${args.email} has been invited`);
                  onInvite({ name: args.name, email: args.email });
                  return {
                    description: `The user confirmed inviting ${args.email} to the team`,
                    data: {},
                  };
                }}
              >
                Invite <code>{args.email}</code> to the team?
              </AiTool.Confirmation>
            </AiTool>
          );
        },
      })}
    />
  );
}

export function TransactionToolAi() {
  return (
    <RegisterAiTool
      name="transaction"
      tool={defineAiTool()({
        description: "Display the transaction details",
        parameters: {
          type: "object",
          properties: {
            transactionId: { type: "string" },
          },
          additionalProperties: false,
          required: ["transactionId"],
        },
        render: ({ args }) => {
          if (!args) return null;
          return <TransactionToolUi transactionId={args.transactionId} />;
        },
      })}
    />
  );
}

export function MemberToolAi() {
  return (
    <RegisterAiTool
      name="member"
      tool={defineAiTool()({
        description: "Display the member details",
        parameters: {
          type: "object",
          properties: {
            email: { type: "string" },
          },
          additionalProperties: false,
          required: ["email"],
        },
        render: ({ args }) => {
          if (!args) return null;
          return <MemberTool email={args.email} />;
        },
      })}
    />
  );
}

// TODO make this work
function TransactionToolUi({ transactionId }: { transactionId: string }) {
  const transaction = transactions.find(
    (transaction) => transaction.transaction_id === transactionId
  );

  if (!transaction) {
    return <div>Transaction not found</div>;
  }

  const status = expense_statuses.find(
    (item) => item.value === transaction.expense_status
  );

  return (
    <div className="my-2 pt-3.5 pb-4 px-4 rounded bg-neutral-100 w-full">
      <div className="flex justify-between items-center">
        <div className="font-semibold flex items-center gap-1">
          {transaction.merchant}{" "}
          <a href="#">
            <svg
              className="text-blue-600 w-4 h-4"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
          </a>
        </div>
        <Badge variant={status?.variant as any}>{status?.label}</Badge>
      </div>

      <div className="text-xs flex gap-1.5 mt-0.5 items-center">
        {format(transaction.transaction_date, "MMM d yyyy")}, $
        {transaction.amount.toLocaleString()}
      </div>
    </div>
  );
}

function MemberTool({ email }: { email: string }) {
  const user = users.find((user) => user.email === email);

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <div className="flex items-center gap-2 my-2 bg-neutral-100 p-4 rounded">
      <Image
        src={user.avatar}
        alt={`${user.name}'s avatar`}
        width={36}
        height={36}
        className="size-9 rounded-full border border-gray-300 object-cover dark:border-gray-700"
      />
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
          {user?.name}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {user?.email}
        </p>
      </div>
    </div>
  );
}
