import { Label } from "@/components/Label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/Select"
import { useQueryState } from "nuqs"
import { DEFAULT_RANGE, RANGE_DAYS, RANGE_LABELS, RangeKey } from "./dateRanges"

const FilterDate = () => {
  const [range, setRange] = useQueryState<RangeKey>("range", {
    defaultValue: DEFAULT_RANGE,
    parse: (value): RangeKey =>
      Object.keys(RANGE_DAYS).includes(value)
        ? (value as RangeKey)
        : DEFAULT_RANGE,
  })

  const handleValueChange = (value: RangeKey) => {
    setRange(value)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="date-range" className="font-medium">
        Date Range
      </Label>
      <Select value={range} onValueChange={handleValueChange}>
        <SelectTrigger id="date-range" className="w-full md:w-36">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent align="end">
          {Object.entries(RANGE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export { FilterDate }
