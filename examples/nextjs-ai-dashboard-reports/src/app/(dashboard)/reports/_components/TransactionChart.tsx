"use client"
import { BarChartVariant } from "@/components/BarChartVariant"
import { Tooltip } from "@/components/Tooltip"
import { Transaction } from "@/data/schema"
import { transactions } from "@/data/transactions"
import { AvailableChartColorsKeys } from "@/lib/chartUtils"
import { cx, formatters } from "@/lib/utils"
import { InfoIcon } from "lucide-react"
import { useQueryState } from "nuqs"
import { useMemo } from "react"
import { DEFAULT_RANGE, RANGE_DAYS, RangeKey } from "./dateRanges"

interface ChartDataItem {
  key: string
  value: number
}

type ChartType = "amount" | "count" | "category" | "merchant"

interface ChartConfig {
  title: string
  tooltipContent: string
  processData: (
    transactions: Transaction[],
    filterDate: Date,
    filters: Filters,
  ) => ChartDataItem[]
  valueFormatter: (value: number) => string
  layout?: "horizontal" | "vertical"
  color: string
  xValueFormatter?: (value: string) => string
}

interface Filters {
  expenseStatus: string
  minAmount: number
  maxAmount: number
  selectedCountries: string[]
}

const chartConfigs: Record<ChartType, ChartConfig> = {
  amount: {
    title: "Total Transaction Amount",
    tooltipContent:
      "Total amount of transactions for the selected period and amount range.",
    color: "blue",
    processData: (transactions, filterDate, filters) => {
      const summedData: Record<string, number> = {}
      transactions.forEach((transaction) => {
        const date = transaction.transaction_date.split("T")[0]
        if (isTransactionValid(transaction, filterDate, filters)) {
          summedData[date] = (summedData[date] || 0) + transaction.amount
        }
      })
      return Object.entries(summedData).map(([date, value]) => ({
        key: date,
        value,
      }))
    },
    valueFormatter: (number: number) =>
      formatters.currency({ number: number, maxFractionDigits: 0 }),
    xValueFormatter: (dateString: string) => {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })
    },
  },
  count: {
    title: "Transaction Count",
    tooltipContent:
      "Total number of transactions for the selected period and amount range.",
    processData: (transactions, filterDate, filters) => {
      const countedData: Record<string, number> = {}
      transactions.forEach((transaction) => {
        const date = transaction.transaction_date.split("T")[0]
        if (isTransactionValid(transaction, filterDate, filters)) {
          countedData[date] = (countedData[date] || 0) + 1
        }
      })
      return Object.entries(countedData).map(([date, value]) => ({
        key: date,
        value,
      }))
    },
    valueFormatter: (number: number) =>
      Intl.NumberFormat("us").format(number).toString(),
    color: "blue",
    xValueFormatter: (dateString: string) => {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })
    },
  },
  category: {
    title: "Top 5 Categories by Transaction Amount",
    tooltipContent:
      "Total amount of transactions for the top 5 categories in the selected period and amount range.",
    processData: (transactions, filterDate, filters) => {
      const categoryTotals: Record<string, number> = {}
      transactions.forEach((transaction) => {
        if (isTransactionValid(transaction, filterDate, filters)) {
          categoryTotals[transaction.category] =
            (categoryTotals[transaction.category] || 0) + transaction.amount
        }
      })
      return Object.entries(categoryTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([category, value]) => ({ key: category, value }))
    },
    valueFormatter: (number: number) =>
      formatters.currency({ number: number, maxFractionDigits: 0 }),
    layout: "vertical",
    color: "emerald",
  },
  merchant: {
    title: "Top 5 Merchants by Transaction Amount",
    tooltipContent:
      "Total amount of transactions for the top 5 merchants in the selected period and amount range.",
    processData: (transactions, filterDate, filters) => {
      const merchantTotals: Record<string, number> = {}
      transactions.forEach((transaction) => {
        if (isTransactionValid(transaction, filterDate, filters)) {
          merchantTotals[transaction.merchant] =
            (merchantTotals[transaction.merchant] || 0) + transaction.amount
        }
      })
      return Object.entries(merchantTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([merchant, value]) => ({ key: merchant, value }))
    },
    valueFormatter: (number: number) =>
      formatters.currency({ number: number, maxFractionDigits: 0 }),
    layout: "vertical",
    color: "orange",
  },
}

const isTransactionValid = (
  transaction: Transaction,
  filterDate: Date,
  filters: Filters,
) => {
  const { expenseStatus, minAmount, maxAmount, selectedCountries } = filters
  const transactionDate = new Date(transaction.transaction_date)
  return (
    transactionDate >= filterDate &&
    (expenseStatus === "all" || transaction.expense_status === expenseStatus) &&
    transaction.amount >= minAmount &&
    transaction.amount <= maxAmount &&
    (selectedCountries.length === 0 ||
      selectedCountries.includes(transaction.country))
  )
}

export function TransactionChart({
  type,
  yAxisWidth,
  showYAxis,
  className,
}: {
  type: ChartType
  yAxisWidth?: number
  showYAxis?: boolean
  className?: string
}) {
  const [range] = useQueryState<RangeKey>("range", {
    defaultValue: DEFAULT_RANGE,
    parse: (value): RangeKey =>
      Object.keys(RANGE_DAYS).includes(value)
        ? (value as RangeKey)
        : DEFAULT_RANGE,
  })
  const [expenseStatus] = useQueryState("expense_status", {
    defaultValue: "all",
  })
  const [amountRange] = useQueryState("amount_range", {
    defaultValue: "0-Infinity",
  })
  const [selectedCountries] = useQueryState<string[]>("countries", {
    defaultValue: [],
    parse: (value: string) => (value ? value.split("+") : []),
    serialize: (value: string[]) => value.join("+"),
  })

  const [minAmount, maxAmount] = useMemo(() => {
    const [min, max] = amountRange.split("-").map(Number)
    return [min, max === Infinity ? Number.MAX_SAFE_INTEGER : max]
  }, [amountRange])

  const config = chartConfigs[type]

  const chartData = useMemo(() => {
    const currentDate = new Date()
    const filterDate = new Date(currentDate)
    const daysToSubtract = RANGE_DAYS[range] || RANGE_DAYS[DEFAULT_RANGE]
    filterDate.setDate(currentDate.getDate() - daysToSubtract)

    const filters: Filters = {
      expenseStatus,
      minAmount,
      maxAmount,
      selectedCountries,
    }
    return config.processData(transactions, filterDate, filters)
  }, [range, expenseStatus, minAmount, maxAmount, selectedCountries, config])

  const totalValue = useMemo(
    () => Math.round(chartData.reduce((sum, item) => sum + item.value, 0)),
    [chartData],
  )

  return (
    <div className={cx(className, "w-full")}>
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <h2
            id={`${type}-chart-title`}
            className="text-sm text-gray-600 dark:text-gray-400"
          >
            {config.title}
          </h2>
          <Tooltip side="bottom" content={config.tooltipContent}>
            <InfoIcon className="size-4 text-gray-600 dark:text-gray-400" />
          </Tooltip>
        </div>
      </div>
      <p
        className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-50"
        aria-live="polite"
      >
        {config.valueFormatter(totalValue)}
      </p>
      <BarChartVariant
        data={chartData}
        index="key"
        categories={["value"]}
        showLegend={false}
        colors={[config.color as AvailableChartColorsKeys]}
        yAxisWidth={yAxisWidth}
        valueFormatter={config.valueFormatter}
        xValueFormatter={config.xValueFormatter}
        showYAxis={showYAxis}
        className="mt-6 h-48"
        layout={config.layout}
        barCategoryGap="6%"
        aria-labelledby={`${type}-chart-title`}
        role="figure"
        aria-roledescription="chart"
      />
    </div>
  )
}
