"use client"
import { Button } from "@/components/Button"
import {
  RadioCardGroup,
  RadioCardIndicator,
  RadioCardItem,
} from "@/components/RadioCardGroup"
import Link from "next/link"
import { useRouter } from "next/navigation"
import React, { useState } from "react"

const employeeCounts = [
  { value: "1", label: "1" },
  { value: "2-5", label: "2 – 5" },
  { value: "6-20", label: "6 – 20" },
  { value: "21-100", label: "21 – 100" },
  { value: "101-500", label: "101 – 500" },
  { value: "501+", label: "501+" },
]

export default function Employees() {
  const [selectedEmployeeCount, setSelectedEmployeeCount] = useState("")
  const [loading, setLoading] = React.useState(false)
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      console.log("Form submitted with employee count:", selectedEmployeeCount)
      router.push("/onboarding/infrastructure")
    }, 600)
  }

  return (
    <main className="mx-auto p-4">
      <div
        className="motion-safe:animate-revealBottom"
        style={{ animationDuration: "500ms" }}
      >
        <h1 className="text-2xl font-semibold text-gray-900 sm:text-xl dark:text-gray-50">
          How many employees does your company have?
        </h1>
        <p className="mt-6 text-gray-700 sm:text-sm dark:text-gray-300">
          This will help us customize the experience to you.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="mt-4">
        <fieldset>
          <legend className="sr-only">Select number of employees</legend>
          <RadioCardGroup
            value={selectedEmployeeCount}
            onValueChange={(value) => setSelectedEmployeeCount(value)}
            required
            aria-label="Number of employees"
          >
            {employeeCounts.map((count, index) => (
              <div
                className="motion-safe:animate-revealBottom"
                key={count.value}
                style={{
                  animationDuration: "600ms",
                  animationDelay: `${100 + index * 50}ms`,
                  animationFillMode: "backwards",
                }}
              >
                <RadioCardItem
                  className="active:scale-[99%] dark:bg-gray-925"
                  key={count.value}
                  value={count.value}
                  style={{
                    animationDuration: "600ms",
                    animationDelay: `${100 + index * 50}ms`,
                    animationFillMode: "backwards",
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <RadioCardIndicator />
                    <span className="block sm:text-sm">{count.label}</span>
                  </div>
                </RadioCardItem>
              </div>
            ))}
          </RadioCardGroup>
        </fieldset>
        <div className="mt-6 flex justify-between">
          <Button type="button" variant="ghost" asChild>
            <Link href="/onboarding/products">Back</Link>
          </Button>
          <Button
            className="disabled:bg-gray-200 disabled:text-gray-500"
            type="submit"
            disabled={!selectedEmployeeCount || loading}
            aria-disabled={!selectedEmployeeCount || loading}
            isLoading={loading}
          >
            {loading ? "Submitting..." : "Continue"}
          </Button>
        </div>
      </form>
    </main>
  )
}
