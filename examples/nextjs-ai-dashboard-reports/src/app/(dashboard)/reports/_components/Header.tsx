"use client"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/Accordion"
import { Button } from "@/components/Button"
import useScroll from "@/lib/useScroll"
import { cx } from "@/lib/utils"
import { useQueryState } from "nuqs"
import React from "react"
import { FilterAmount } from "./FilterAmount"
import { FilterCountry } from "./FilterCountry"
import { FilterDate } from "./FilterDate"
import { FilterExpenseStatus } from "./FilterExpenseStatus"
import { DEFAULT_RANGE } from "./dateRanges"

function FormattedDate() {
  const [dateString, setDateString] = React.useState<string>("")

  React.useEffect(() => {
    const date = new Date(new Date().setHours(new Date().getHours() - 1))
    setDateString(
      date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    )
  }, [])

  return (
    <p className="whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
      Last refresh: {dateString}
    </p>
  )
}

export default function Header() {
  const scrolled = useScroll(10)

  const [, setRange] = useQueryState("range")
  const [, setExpenseStatus] = useQueryState("expense_status")
  const [, setAmountRange] = useQueryState("amount_range")
  const [, setSelectedCountries] = useQueryState("countries")

  const handleResetFilters = () => {
    setRange(DEFAULT_RANGE)
    setExpenseStatus(null)
    setAmountRange(null)
    setSelectedCountries(null)
  }

  return (
    <section
      aria-labelledby="reports-title"
      className={cx(
        "sticky top-16 z-50 -my-6 flex flex-col gap-6 bg-white py-6 md:flex-row md:flex-wrap md:items-center md:justify-between lg:top-0 dark:bg-gray-925",
        scrolled &&
          "border-b border-gray-200 transition-all dark:border-gray-900",
      )}
    >
      <div className="space-y-1">
        <h1
          id="reports-title"
          className="text-lg font-semibold text-gray-900 dark:text-gray-50"
        >
          Reports
        </h1>
        <FormattedDate />
      </div>
      <Accordion type="single" collapsible className="block md:hidden">
        <AccordionItem className="rounded-md border" value="1">
          <AccordionTrigger className="px-4 py-2.5">Filters</AccordionTrigger>
          <AccordionContent className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <FilterDate />
              <FilterCountry />
              <FilterExpenseStatus />
              <FilterAmount />
              <Button
                variant="light"
                className="h-fit dark:border-gray-800"
                onClick={handleResetFilters}
              >
                Reset
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <div className="hidden items-end gap-3 md:flex md:flex-wrap">
        <FilterDate />
        <FilterCountry />
        <FilterExpenseStatus />
        <FilterAmount />
        <Button
          variant="light"
          className="h-fit dark:border-gray-800"
          onClick={handleResetFilters}
        >
          Reset
        </Button>
      </div>
    </section>
  )
}
