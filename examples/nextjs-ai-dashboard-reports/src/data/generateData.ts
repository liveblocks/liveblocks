import { faker } from "@faker-js/faker"
import fs from "fs"
import path from "path"
import {
  categories,
  currencies,
  expense_statuses,
  locations,
  merchants,
  payment_statuses,
} from "./schema"

// Helper function to get a weighted random continent and country
const getWeightedLocation = (): { continent: string; country: string } => {
  // Total weight for weighted random selection
  const totalWeight = locations.reduce((sum, loc) => sum + loc.weight, 0)
  let random = Math.random() * totalWeight

  for (const loc of locations) {
    if (random < loc.weight) {
      const country = faker.helpers.arrayElement(loc.countries)
      return { continent: loc.name, country }
    }
    random -= loc.weight
  }

  // Fallback in case of error
  const fallbackContinent = locations[0]
  return {
    continent: fallbackContinent.name,
    country: faker.helpers.arrayElement(fallbackContinent.countries),
  }
}

const transactions = Array.from({ length: 1800 }, () => {
  const location = getWeightedLocation()
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
  }
})

const sortedTransactions = transactions.sort(
  (a, b) =>
    new Date(b.transaction_date).getTime() -
    new Date(a.transaction_date).getTime(),
)

const finalArray = `import { Transaction } from "./schema";
export const transactions: Transaction[] = ${JSON.stringify(sortedTransactions, null, 2)};
`

fs.writeFileSync(path.join(__dirname, "transactions.ts"), finalArray)
console.log("Data generated and sorted by date, newest first.")
