"use client"

import { Button } from "@/components/Button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog"
import { Divider } from "@/components/Divider"
import { Input } from "@/components/Input"
import { Label } from "@/components/Label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/Select"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFoot,
  TableHead,
  TableHeaderCell,
  TableRoot,
  TableRow,
} from "@/components/Table"
import { CircleCheck, Plus } from "lucide-react"

const data = [
  {
    name: "Starter Tier (Start-Up Discount)¹",
    quantity: 1,
    unit: "$90",
    price: "$90",
  },
  {
    name: "Bank & CPA Integration",
    quantity: 1,
    unit: "$25",
    price: "$25",
  },
  {
    name: "Corporate Card (VISA World Elite)",
    quantity: 2,
    unit: "$45",
    price: "$90",
  },
]

const states = [
  {
    value: "colorado",
    label: "Colorado",
  },
  {
    value: "florida",
    label: "Florida",
  },
  {
    value: "georgia",
    label: "Georgia",
  },
  {
    value: "delaware",
    label: "Delaware",
  },
  {
    value: "hawaii",
    label: "Hawaii",
  },
]

export default function Billing() {
  return (
    <div className="space-y-10">
      <section aria-labelledby="billing-overview-heading">
        <div className="grid grid-cols-1 gap-x-14 gap-y-8 md:grid-cols-3">
          <div>
            <h2
              id="billing-overview-heading"
              className="scroll-mt-10 font-semibold text-gray-900 dark:text-gray-50"
            >
              Billing
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Overview of current billing cycle based on fixed and on-demand
              charges.
            </p>
          </div>
          <div className="md:col-span-2">
            <h3
              id="current-cycle-heading"
              className="text-sm font-semibold text-gray-900 dark:text-gray-50"
            >
              Current billing cycle (Aug 31 – Sep 30, 2024)
            </h3>
            <TableRoot className="mt-4" aria-labelledby="current-cycle-heading">
              <Table className="border-transparent dark:border-transparent">
                <TableCaption className="text-left text-xs">
                  ¹Includes 10,000 trackable expenses/month, USD 0.10 for each
                  additional expense.
                </TableCaption>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell className="text-xs font-medium uppercase">
                      Item
                    </TableHeaderCell>
                    <TableHeaderCell className="text-right text-xs font-medium uppercase">
                      Quantity
                    </TableHeaderCell>
                    <TableHeaderCell className="text-right text-xs font-medium uppercase">
                      Unit price
                    </TableHeaderCell>
                    <TableHeaderCell className="text-right text-xs font-medium uppercase">
                      Price
                    </TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.map((member) => (
                    <TableRow key={member.name}>
                      <TableCell className="py-2.5">{member.name}</TableCell>
                      <TableCell className="py-2.5 text-right">
                        {member.quantity}
                      </TableCell>
                      <TableCell className="py-2.5 text-right">
                        {member.unit}
                      </TableCell>
                      <TableCell className="py-2.5 text-right">
                        {member.price}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFoot>
                  <TableRow>
                    <TableHeaderCell
                      scope="row"
                      colSpan={3}
                      className="border-transparent pb-1.5 text-right font-normal text-gray-600 dark:border-transparent dark:text-gray-400"
                    >
                      Subtotal
                    </TableHeaderCell>
                    <TableCell className="pb-1.5 text-right font-normal">
                      $205.00
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHeaderCell
                      scope="row"
                      colSpan={3}
                      className="border-transparent py-1.5 text-right font-normal text-gray-600 dark:border-transparent dark:text-gray-400"
                    >
                      VAT (7.7%)
                    </TableHeaderCell>
                    <TableCell className="py-1.5 text-right font-normal">
                      $15.80
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHeaderCell
                      scope="row"
                      colSpan={3}
                      className="border-transparent py-1.5 text-right dark:border-transparent dark:text-gray-300"
                    >
                      Total
                    </TableHeaderCell>
                    <TableCell className="py-1.5 text-right text-gray-900 dark:text-gray-300">
                      $220.80
                    </TableCell>
                  </TableRow>
                </TableFoot>
              </Table>
            </TableRoot>
          </div>
        </div>
      </section>
      <Divider />
      <section aria-labelledby="payment-method-heading">
        <div className="grid grid-cols-1 gap-x-14 gap-y-8 md:grid-cols-3">
          <div>
            <h2
              id="payment-method-heading"
              className="scroll-mt-10 font-semibold text-gray-900 dark:text-gray-50"
            >
              Payment method
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Payments will be taken from the card(s) listed below. You can add
              additional credit cards.
            </p>
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <h3
                id="cards-heading"
                className="text-sm font-semibold text-gray-900 dark:text-gray-50"
              >
                Cards
              </h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus
                      className="-ml-1 size-4 shrink-0"
                      aria-hidden="true"
                    />
                    Add card
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add New Card</DialogTitle>
                    <DialogDescription className="mt-1 text-sm leading-6">
                      Fill in the details below to add a new card.
                    </DialogDescription>
                  </DialogHeader>
                  <form className="mt-4 space-y-4">
                    <div>
                      <Label htmlFor="cardName" className="font-medium">
                        Cardholder Name
                      </Label>
                      <Input
                        type="text"
                        id="cardName"
                        name="cardName"
                        className="mt-2"
                        placeholder="Cardholder Name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="cardNumber" className="font-medium">
                        Card Number
                      </Label>
                      <Input
                        type="text"
                        id="cardNumber"
                        name="cardNumber"
                        className="mt-2"
                        placeholder="Card Number"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expiryDate" className="font-medium">
                          Expiry Date
                        </Label>
                        <Input
                          type="text"
                          id="expiryDate"
                          name="expiryDate"
                          className="mt-2"
                          placeholder="MM/YY"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="cvv" className="font-medium">
                          CVV
                        </Label>
                        <Input
                          type="text"
                          id="cvv"
                          name="cvv"
                          className="mt-2"
                          placeholder="CVV"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="cardType" className="font-medium">
                        Card Type
                      </Label>
                      <Select name="cardType">
                        <SelectTrigger id="cardType" className="mt-2 w-full">
                          <SelectValue placeholder="Select Card Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credit">Credit</SelectItem>
                          <SelectItem value="debit">Debit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter className="mt-6">
                      <DialogClose asChild>
                        <Button
                          className="mt-2 w-full sm:mt-0 sm:w-fit"
                          variant="secondary"
                        >
                          Cancel
                        </Button>
                      </DialogClose>
                      <Button
                        className="w-full gap-2 sm:w-fit"
                        variant="primary"
                        type="submit"
                      >
                        Add Card
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <TableRoot className="mt-4" aria-labelledby="cards-heading">
              <Table>
                <TableHead>
                  <TableRow className="border-b border-gray-200 dark:border-gray-800">
                    <TableHeaderCell className="text-xs font-medium uppercase">
                      Provider
                    </TableHeaderCell>
                    <TableHeaderCell className="text-xs font-medium uppercase">
                      Status
                    </TableHeaderCell>
                    <TableHeaderCell className="text-xs font-medium uppercase">
                      Type
                    </TableHeaderCell>
                    <TableHeaderCell className="text-xs font-medium uppercase">
                      Number (Last 4)
                    </TableHeaderCell>
                    <TableHeaderCell className="text-xs font-medium uppercase">
                      Exp. Date
                    </TableHeaderCell>
                    <TableHeaderCell className="text-right text-xs font-medium uppercase">
                      <span className="sr-only">Edit</span>
                    </TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell className="py-2.5">MasterCard</TableCell>
                    <TableCell className="flex items-center gap-1.5 py-2.5">
                      <CircleCheck
                        className="size-4 text-emerald-600 dark:text-emerald-500"
                        aria-hidden="true"
                      />
                      <span>Active</span>
                    </TableCell>
                    <TableCell className="py-2.5">Credit</TableCell>
                    <TableCell className="py-2.5">****1234</TableCell>
                    <TableCell className="py-2.5">1/2028</TableCell>
                    <TableCell className="py-2.5 text-right">
                      <a
                        href="#"
                        className="font-medium text-blue-600 dark:text-blue-500"
                        aria-label="Edit MasterCard ending in 1234"
                      >
                        Edit
                      </a>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableRoot>
          </div>
        </div>
      </section>
      <Divider />
      <section aria-labelledby="billing-address-heading">
        <div className="grid grid-cols-1 gap-x-14 gap-y-8 md:grid-cols-3">
          <div>
            <h2
              id="billing-address-heading"
              className="scroll-mt-10 font-semibold text-gray-900 dark:text-gray-50"
            >
              Billing address
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              If you would like to add a postal address to every invoice, enter
              it here.
            </p>
          </div>
          <div className="md:col-span-2">
            <h3
              id="update-address-heading"
              className="text-sm font-semibold text-gray-900 dark:text-gray-50"
            >
              Update address
            </h3>
            <form
              className="mt-6 space-y-4"
              aria-labelledby="update-address-heading"
            >
              <div>
                <Label htmlFor="address-line-1" className="font-medium">
                  Address line 1
                </Label>
                <Input
                  id="address-line-1"
                  name="address-line-1"
                  placeholder="Address line 1"
                  autoComplete="address-line1"
                  value="8272 Postal Way"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="address-line-2" className="font-medium">
                  Address line 2
                </Label>
                <Input
                  id="address-line-2"
                  name="address-line-2"
                  placeholder="Address line 2"
                  autoComplete="address-line2"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="city" className="font-medium">
                  City
                </Label>
                <Input
                  id="city"
                  name="city"
                  placeholder="City"
                  autoComplete="address-level2"
                  value="Denver"
                  className="mt-2"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="state" className="font-medium">
                    State
                  </Label>
                  <Select defaultValue={states[0].value}>
                    <SelectTrigger id="state" name="state" className="mt-2">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="postal-code" className="font-medium">
                    Postal code
                  </Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    id="postal-code"
                    name="postal-code"
                    placeholder="Postal code"
                    autoComplete="postal-code"
                    value="63001"
                    className="mt-2"
                  />
                </div>
              </div>
              <div className="mt-2 flex justify-end">
                <Button type="submit">Update</Button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}
