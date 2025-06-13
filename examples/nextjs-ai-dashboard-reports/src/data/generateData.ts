import { faker } from "@faker-js/faker";
import fs from "fs";
import path from "path";
import {
  categories,
  currencies,
  expense_statuses,
  locations,
  merchants,
  payment_statuses,
  invoice_statuses,
} from "./schema";

const TRANSACTION_COUNT = 1800;
const INVOICE_COUNT = 1000;

// Helper function to get a weighted random continent and country
const getWeightedLocation = (): { continent: string; country: string } => {
  const totalWeight = locations.reduce((sum, loc) => sum + loc.weight, 0);
  let random = Math.random() * totalWeight;

  for (const loc of locations) {
    if (random < loc.weight) {
      const country = faker.helpers.arrayElement(loc.countries);
      return { continent: loc.name, country };
    }
    random -= loc.weight;
  }

  const fallbackContinent = locations[0];
  return {
    continent: fallbackContinent.name,
    country: faker.helpers.arrayElement(fallbackContinent.countries),
  };
};

// === Custom invoice description helper ===
const generateInvoiceDescription = (client: string): string => {
  const templates = [
    `Monthly service subscription for ${client}`,
    `Consulting services rendered to ${client}`,
    `Invoice for development work with ${client}`,
    `Professional support fees charged to ${client}`,
    `Marketing services delivered to ${client}`,
    `Technical setup and onboarding for ${client}`,
  ];
  return faker.helpers.arrayElement(templates);
};

// === Generate Transactions ===
const transactions = Array.from({ length: TRANSACTION_COUNT }, () => {
  const location = getWeightedLocation();
  return {
    transaction_id: `tx-${faker.string.nanoid()}`,
    transaction_date: faker.date
      .between({ from: "2024-06-01T00:00:00Z", to: "2025-03-17T00:00:00Z" })
      .toISOString(),
    expense_status: faker.helpers.weightedArrayElement(expense_statuses),
    payment_status: faker.helpers.weightedArrayElement(payment_statuses),
    merchant: faker.helpers.arrayElement(merchants),
    category: faker.helpers.arrayElement(categories),
    amount: parseFloat(faker.finance.amount({ min: 0, max: 12000 })),
    currency: faker.helpers.weightedArrayElement(currencies),
    lastEdited: faker.date
      .between({ from: "2024-06-01T00:00:00Z", to: "2025-03-17T00:00:00Z" })
      .toISOString(),
    continent: location.continent,
    country: location.country,
  };
});

const sortedTransactions = transactions.sort(
  (a, b) =>
    new Date(b.transaction_date).getTime() -
    new Date(a.transaction_date).getTime()
);

// === Generate Invoices ===
const invoices = Array.from({ length: INVOICE_COUNT }, () => {
  const location = getWeightedLocation();
  const invoice_status = faker.helpers.weightedArrayElement(invoice_statuses);
  const client = faker.helpers.arrayElement(merchants);

  const linkedTx =
    invoice_status === "paid"
      ? faker.helpers.arrayElement(transactions).transaction_id
      : undefined;

  const invoiceDate = faker.date.between({
    from: "2024-05-01T00:00:00Z",
    to: "2025-03-10T00:00:00Z",
  });

  const dueDate = faker.date.soon({ days: 30, refDate: invoiceDate });

  return {
    invoice_id: `inv-${faker.string.nanoid()}`,
    invoice_date: invoiceDate.toISOString(),
    due_date: dueDate.toISOString(),
    client,
    invoice_status,
    linked_transaction_id: linkedTx,
    amount: parseFloat(faker.finance.amount({ min: 50, max: 15000 })),
    currency: faker.helpers.weightedArrayElement(currencies),
    description: generateInvoiceDescription(client),
    lastEdited: faker.date
      .between({ from: invoiceDate, to: dueDate })
      .toISOString(),
    continent: location.continent,
    country: location.country,
  };
});

// === Write Transactions File ===
const finalTransactionOutput = `import { Transaction } from "./schema";
export const transactions: Transaction[] = ${JSON.stringify(sortedTransactions, null, 2)};
`;

fs.writeFileSync(
  path.join(__dirname, "transactions.ts"),
  finalTransactionOutput
);

// === Write Invoices File ===
const finalInvoiceOutput = `import { Invoice } from "./schema";
export const invoices: Invoice[] = ${JSON.stringify(invoices, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, "invoices.ts"), finalInvoiceOutput);

console.log("✅ Transactions and Invoices generated successfully.");
