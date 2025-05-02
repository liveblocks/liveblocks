import { z } from "zod"

export const transactionSchema = z.object({
  transaction_id: z.string(),
  transaction_date: z.string(),
  expense_status: z.string(),
  payment_status: z.string(),
  merchant: z.string(),
  category: z.string(),
  amount: z.number(),
  currency: z.string(),
  lastEdited: z.string(),
  continent: z.string(),
  country: z.string(),
})

export type Transaction = z.infer<typeof transactionSchema>

export const categories = [
  "Office Supplies",
  "Rent",
  "Utilities",
  "Employee Salaries",
  "Marketing",
  "Travel",
  "Training & Development",
  "Consulting Fees",
  "Professional Services",
  "Insurance",
  "Technology & Software",
  "Internet",
  "Phone",
  "Legal Fees",
  "Accounting Services",
  "Subscriptions & Memberships",
  "Maintenance & Repairs",
  "Shipping & Delivery",
  "Inventory",
  "Advertising",
]

export const merchants = [
  "Adobe",
  "AliExpress",
  "Amazon",
  "Amazon Advertising",
  "American Airlines",
  "Apple",
  "Best Buy",
  "Delta Air Lines",
  "DoorDash",
  "Facebook Ads",
  "FedEx",
  "Google Ads",
  "Google G Suite",
  "Linkedin",
  "Lyft",
  "Microsoft",
  "Starbucks",
  "The Home Depot",
  "Twilio",
  "Uber",
  "Uber Eats",
  "Uber HQ",
  "United Airlines",
  "USPS",
  "Walmart",
]

export const expense_statuses = [
  {
    value: "approved",
    label: "Approved",
    variant: "success",
    weight: 0.9,
  },
  {
    value: "pending",
    label: "Pending",
    variant: "neutral",
    weight: 0.05,
  },
  {
    value: "actionRequired",
    label: "Action required",
    variant: "error",
    weight: 0.04,
  },
  {
    value: "inAudit",
    label: "In audit",
    variant: "warning",
    weight: 0.01,
  },
]

export const payment_statuses = [
  {
    value: "processing",
    label: "Processing",
    weight: 0.01,
  },
  {
    value: "cleared",
    label: "Cleared",
    weight: 0.99,
  },
]

export const currencies = [
  {
    value: "usd",
    label: "USD",
    weight: 0.85,
  },
  {
    value: "eur",
    label: "EUR",
    weight: 0.15,
  },
]

export const locations = [
  {
    name: "Africa",
    countries: [
      "Nigeria",
      "Ethiopia",
      "Egypt",
      "South Africa",
      "Kenya",
      "Uganda",
    ],
    weight: 10,
  },
  {
    name: "Asia",
    countries: [
      "China",
      "India",
      "Indonesia",
      "Japan",
      "Philippines",
      "Vietnam",
      "Thailand",
      "South Korea",
      "Iraq",
      "Saudi Arabia",
      "Uzbekistan",
      "Malaysia",
      "Nepal",
      "Sri Lanka",
    ],
    weight: 10,
  },
  {
    name: "Europe",
    countries: [
      "Germany",
      "France",
      "United Kingdom",
      "Italy",
      "Spain",
      "Poland",
      "Netherlands",
      "Belgium",
      "Czech Republic",
      "Greece",
      "Portugal",
      "Switzerland",
      "Austria",
      "Sweden",
      "Hungary",
      "Denmark",
      "Norway",
    ],
    weight: 25,
  },
  {
    name: "North America",
    countries: [
      "United States",
      "Canada",
      "Mexico",
      "Guatemala",
      "Honduras",
      "El Salvador",
    ],
    weight: 25,
  },
  {
    name: "South America",
    countries: [
      "Brazil",
      "Argentina",
      "Colombia",
      "Chile",
      "Peru",
      "Venezuela",
    ],
    weight: 10,
  },
  {
    name: "Australia",
    countries: ["Australia", "New Zealand", "Fiji"],
    weight: 10,
  },
]
