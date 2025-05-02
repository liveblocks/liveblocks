"use client"
import { badgeVariants } from "@/components/Badge"
import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { Checkbox } from "@/components/Checkbox"
import { Label } from "@/components/Label"
import { cx } from "@/lib/utils"
import { useRouter } from "next/navigation"
import React from "react"

interface Category {
  id: string
  title: string
  subcategories: string[]
}

interface CheckedItems {
  [categoryId: string]: boolean
}

interface CategoryItemProps {
  category: Category
  checked: boolean
  onCheckedChange: (categoryId: string, checked: boolean) => void
}

const categories: Category[] = [
  {
    id: "1",
    title: "User Analytics",
    subcategories: [
      "User Segmentation",
      "Cohort Analysis",
      "Retention Analysis",
    ],
  },
  {
    id: "2",
    title: "Event Tracking",
    subcategories: ["Custom Events", "Automated Events", "Event Funnels"],
  },
  {
    id: "3",
    title: "A/B Testing",
    subcategories: ["Experiment Setup", "Variant Analysis", "Reporting"],
  },
  {
    id: "4",
    title: "User Journeys",
    subcategories: ["Journey Mapping", "Conversion Paths", "Drop-off Analysis"],
  },
  {
    id: "5",
    title: "Engagement Tracking",
    subcategories: ["Email Campaigns", "Push Notifications", "In-app Messages"],
  },
  {
    id: "6",
    title: "Data Management",
    subcategories: ["Data Import", "Data Export", "Integrations"],
  },
  {
    id: "7",
    title: "Security & Compliance",
    subcategories: ["Data Encryption", "User Permissions", "GDPR Compliance"],
  },
]

const CategoryItem = ({
  category,
  checked,
  onCheckedChange,
}: CategoryItemProps) => {
  return (
    <Card
      asChild
      className={cx(
        "cursor-pointer border-gray-300 p-5 transition-all active:scale-[99%] dark:border-gray-800",
        "has-[:checked]:border-blue-500",
        "duration-500 has-[:checked]:dark:border-blue-500",
        // base
        "focus-within:ring-2",
        // ring color
        "focus-within:ring-blue-200 focus-within:dark:ring-blue-700/30",
        // border color
        "focus-within:border-blue-500 focus-within:dark:border-blue-700",
      )}
    >
      <Label className="block" htmlFor={category.id}>
        <div className="mb-2 flex items-center gap-2.5">
          <Checkbox
            id={category.id}
            name={category.title}
            checked={checked}
            onCheckedChange={(isChecked) =>
              onCheckedChange(category.id, isChecked === true)
            }
          />
          <span className="text-base font-medium sm:text-sm">
            {category.title}
          </span>
        </div>
        {category.subcategories.length > 0 && (
          <ul className="ml-6 mt-2 flex flex-wrap gap-1.5">
            {category.subcategories.map((subcategory) => (
              <li
                className={badgeVariants({ variant: "neutral" })}
                key={subcategory}
              >
                {subcategory}
              </li>
            ))}
          </ul>
        )}
      </Label>
    </Card>
  )
}

export default function Products() {
  const [checkedItems, setCheckedItems] = React.useState<CheckedItems>({})
  const [loading, setLoading] = React.useState(false)
  const router = useRouter()

  const handleCheckedChange = (categoryId: string, isChecked: boolean) => {
    setCheckedItems((prevCheckedItems) => ({
      ...prevCheckedItems,
      [categoryId]: isChecked,
    }))
  }

  const isAnyItemChecked = Object.values(checkedItems).some(Boolean)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      console.log("Form submitted:", checkedItems)
      router.push("/onboarding/employees")
    }, 400)
  }

  return (
    <main className="mx-auto p-4">
      <div
        style={{ animationDuration: "500ms" }}
        className="motion-safe:animate-revealBottom"
      >
        <h1 className="text-2xl font-semibold text-gray-900 sm:text-xl dark:text-gray-50">
          Which products are you interested in?
        </h1>
        <p className="mt-6 text-gray-700 sm:text-sm dark:text-gray-300">
          You can choose multiple. This will help us customize the experience.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="mt-4">
        <fieldset>
          <legend className="sr-only">
            Select products you are interested in
          </legend>
          <div className="space-y-2">
            {categories.map((category, index) => (
              <div
                className="motion-safe:animate-revealBottom"
                key={category.id}
                style={{
                  animationDuration: "600ms",
                  animationDelay: `${100 + index * 50}ms`,
                  animationFillMode: "backwards",
                }}
              >
                <CategoryItem
                  key={category.id}
                  category={category}
                  checked={checkedItems[category.id] || false}
                  onCheckedChange={handleCheckedChange}
                />
              </div>
            ))}
          </div>
        </fieldset>
        <div className="mt-6 flex justify-end">
          <Button
            className="disabled:bg-gray-200 disabled:text-gray-500"
            type="submit"
            disabled={!isAnyItemChecked || loading}
            aria-disabled={!isAnyItemChecked || loading}
            isLoading={loading}
          >
            {loading ? "Submitting..." : "Continue"}
          </Button>
        </div>
      </form>
    </main>
  )
}
