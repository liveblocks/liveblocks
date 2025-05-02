"use client"
import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { Input } from "@/components/Input"
import { Label } from "@/components/Label"
import { RadioCardGroup, RadioCardItem } from "@/components/RadioCardGroup"
import { RadioGroup, RadioGroupItem } from "@/components/RadioGroup"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/Select"
import { Slider } from "@/components/Slider"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { SVGProps } from "react"
import React, { useEffect, useState } from "react"

type Region = {
  value: string
  label: string
  multiplier: number
}

type CloudProviderRegions = {
  aws: Region[]
  azure: Region[]
}

const regionOptions: CloudProviderRegions = {
  aws: [
    { value: "us-east-2", label: "Ohio (us-east-2)", multiplier: 1.0 },
    {
      value: "us-east-1",
      label: "N. Virginia (us-east-1)",
      multiplier: 1.1,
    },
    { value: "us-west-2", label: "Oregon (us-west-2)", multiplier: 1.0 },
    {
      value: "eu-central-1",
      label: "Frankfurt (eu-central-1)",
      multiplier: 1.2,
    },
    { value: "eu-west-1", label: "Ireland (eu-west-1)", multiplier: 1.2 },
    { value: "eu-west-2", label: "London (eu-west-2)", multiplier: 1.3 },
    {
      value: "ap-northeast-1",
      label: "Tokyo (ap-northeast-1)",
      multiplier: 1.4,
    },
    { value: "ap-south-1", label: "Mumbai (ap-south-1)", multiplier: 0.9 },
    {
      value: "ap-southeast-1",
      label: "Singapore (ap-southeast-1)",
      multiplier: 1.3,
    },
    {
      value: "ap-southeast-2",
      label: "Sydney (ap-southeast-2)",
      multiplier: 1.3,
    },
    { value: "eu-west-3", label: "Paris (eu-west-3)", multiplier: 1.2 },
    {
      value: "ap-northeast-2",
      label: "Seoul (ap-northeast-2)",
      multiplier: 1.4,
    },
    { value: "sa-east-1", label: "São Paulo (sa-east-1)", multiplier: 1.5 },
    {
      value: "ca-central-1",
      label: "Montreal (ca-central-1)",
      multiplier: 1.1,
    },
  ],
  azure: [
    { value: "eastus", label: "East US (eastus)", multiplier: 1.0 },
    { value: "eastus2", label: "East US 2 (eastus2)", multiplier: 1.1 },
    {
      value: "southcentralus",
      label: "South Central US (southcentralus)",
      multiplier: 1.2,
    },
    { value: "westus2", label: "West US 2 (westus2)", multiplier: 1.0 },
    {
      value: "germanywestcentral",
      label: "Germany West Central (germanywestcentral)",
      multiplier: 1.3,
    },
    {
      value: "switzerlandnorth",
      label: "Switzerland North (switzerlandnorth)",
      multiplier: 1.4,
    },
  ],
}

const MicrosoftAzure = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 96 96"
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    {...props}
  >
    <defs>
      <linearGradient
        id="a"
        x1={-1032.17}
        x2={-1059.21}
        y1={145.31}
        y2={65.43}
        gradientTransform="matrix(1 0 0 -1 1075 158)"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset={0} stopColor="#114a8b" />
        <stop offset={1} stopColor="#0669bc" />
      </linearGradient>
      <linearGradient
        id="b"
        x1={-1023.73}
        x2={-1029.98}
        y1={108.08}
        y2={105.97}
        gradientTransform="matrix(1 0 0 -1 1075 158)"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset={0} stopOpacity={0.3} />
        <stop offset={0.07} stopOpacity={0.2} />
        <stop offset={0.32} stopOpacity={0.1} />
        <stop offset={0.62} stopOpacity={0.05} />
        <stop offset={1} stopOpacity={0} />
      </linearGradient>
      <linearGradient
        id="c"
        x1={-1027.16}
        x2={-997.48}
        y1={147.64}
        y2={68.56}
        gradientTransform="matrix(1 0 0 -1 1075 158)"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset={0} stopColor="#3ccbf4" />
        <stop offset={1} stopColor="#2892df" />
      </linearGradient>
    </defs>
    <path
      fill="url(#a)"
      d="M33.34 6.54h26.04l-27.03 80.1a4.15 4.15 0 0 1-3.94 2.81H8.15a4.14 4.14 0 0 1-3.93-5.47L29.4 9.38a4.15 4.15 0 0 1 3.94-2.83z"
    />
    <path
      fill="#0078d4"
      d="M71.17 60.26H29.88a1.91 1.91 0 0 0-1.3 3.31l26.53 24.76a4.17 4.17 0 0 0 2.85 1.13h23.38z"
    />
    <path
      fill="url(#b)"
      d="M33.34 6.54a4.12 4.12 0 0 0-3.95 2.88L4.25 83.92a4.14 4.14 0 0 0 3.91 5.54h20.79a4.44 4.44 0 0 0 3.4-2.9l5.02-14.78 17.91 16.7a4.24 4.24 0 0 0 2.67.97h23.29L71.02 60.26H41.24L59.47 6.55z"
    />
    <path
      fill="url(#c)"
      d="M66.6 9.36a4.14 4.14 0 0 0-3.93-2.82H33.65a4.15 4.15 0 0 1 3.93 2.82l25.18 74.62a4.15 4.15 0 0 1-3.93 5.48h29.02a4.15 4.15 0 0 0 3.93-5.48z"
    />
  </svg>
)

const AmazonWebServices = (props: SVGProps<SVGSVGElement>) => (
  <svg
    id="Layer_1"
    xmlns="http://www.w3.org/2000/svg"
    x={0}
    y={0}
    viewBox="0 0 304 182"
    style={
      {
        enableBackground: "new 0 0 304 182",
      } as React.CSSProperties
    }
    xmlSpace="preserve"
    width="1em"
    height="1em"
    {...props}
  >
    <style>
      {"\n    .st1{fill-rule:evenodd;clip-rule:evenodd;fill:#f90}\n  "}
    </style>
    <path
      d="m86 66 2 9c0 3 1 5 3 8v2l-1 3-7 4-2 1-3-1-4-5-3-6c-8 9-18 14-29 14-9 0-16-3-20-8-5-4-8-11-8-19s3-15 9-20c6-6 14-8 25-8a79 79 0 0 1 22 3v-7c0-8-2-13-5-16-3-4-8-5-16-5l-11 1a80 80 0 0 0-14 5h-2c-1 0-2-1-2-3v-5l1-3c0-1 1-2 3-2l12-5 16-2c12 0 20 3 26 8 5 6 8 14 8 25v32zM46 82l10-2c4-1 7-4 10-7l3-6 1-9v-4a84 84 0 0 0-19-2c-6 0-11 1-15 4-3 2-4 6-4 11s1 8 3 11c3 2 6 4 11 4zm80 10-4-1-2-3-23-78-1-4 2-2h10l4 1 2 4 17 66 15-66 2-4 4-1h8l4 1 2 4 16 67 17-67 2-4 4-1h9c2 0 3 1 3 2v2l-1 2-24 78-2 4-4 1h-9l-4-1-1-4-16-65-15 64-2 4-4 1h-9zm129 3a66 66 0 0 1-27-6l-3-3-1-2v-5c0-2 1-3 2-3h2l3 1a54 54 0 0 0 23 5c6 0 11-2 14-4 4-2 5-5 5-9l-2-7-10-5-15-5c-7-2-13-6-16-10a24 24 0 0 1 5-34l10-5a44 44 0 0 1 20-2 110 110 0 0 1 12 3l4 2 3 2 1 4v4c0 3-1 4-2 4l-4-2c-6-2-12-3-19-3-6 0-11 0-14 2s-4 5-4 9c0 3 1 5 3 7s5 4 11 6l14 4c7 3 12 6 15 10s5 9 5 14l-3 12-7 8c-3 3-7 5-11 6l-14 2z"
      style={{
        fill: "#252f3e dark:#ffffff",
      }}
    />
    <path
      className="st1"
      d="M274 144A220 220 0 0 1 4 124c-4-3-1-6 2-4a300 300 0 0 0 263 16c5-2 10 4 5 8z"
    />
    <path
      className="st1"
      d="M287 128c-4-5-28-3-38-1-4 0-4-3-1-5 19-13 50-9 53-5 4 5-1 36-18 51-3 2-6 1-5-2 5-10 13-33 9-38z"
    />
  </svg>
)

const cloudProviderIcons = {
  aws: AmazonWebServices,
  azure: MicrosoftAzure,
}

export default function PricingCalculator() {
  const [cloudProvider, setCloudProvider] = useState<"aws" | "azure">("aws")
  const [region, setRegion] = useState(regionOptions.aws[0].value)
  const [activeHours, setActiveHours] = useState([6])
  const [storageVolume, setStorageVolume] = useState(6)
  const [compression, setCompression] = useState("false")
  const [loading, setLoading] = React.useState(false)
  const router = useRouter()

  useEffect(() => {
    if (regionOptions[cloudProvider].length > 0) {
      setRegion(regionOptions[cloudProvider][0].value)
    }
  }, [cloudProvider])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      console.log("Form submitted")
      router.push("/reports")
    }, 1200)
  }

  const calculatePrice = () => {
    const basePrices = {
      aws: 0.023,
      azure: 0.025,
    }

    const activeHourMultiplier = 0.05
    const compressionMultiplier = compression === "true" ? 0.7 : 1.0

    const basePrice = basePrices[cloudProvider]
    const selectedRegion = regionOptions[cloudProvider].find(
      (r) => r.value === region,
    )
    const regionMultiplier = selectedRegion?.multiplier || 1.0
    const storagePrice =
      basePrice * storageVolume * regionMultiplier * compressionMultiplier
    const activeHoursPrice = activeHours[0] * activeHourMultiplier

    const totalPricePerDay = storagePrice + activeHoursPrice
    const totalPricePerMonth = totalPricePerDay * 30

    const priceRangeLow = (totalPricePerMonth * 0.8 * 10).toFixed(0)
    const priceRangeHigh = (totalPricePerMonth * 1.2 * 10).toFixed(0)

    return `${priceRangeLow} - ${priceRangeHigh} USD`
  }

  return (
    <main className="mx-auto p-4">
      <div
        style={{ animationDuration: "500ms" }}
        className="motion-safe:animate-revealBottom"
      >
        <h1 className="text-2xl font-semibold text-gray-900 sm:text-xl dark:text-gray-50">
          Create a new compute cluster
        </h1>
        <p className="mt-6 text-gray-700 sm:text-sm dark:text-gray-300">
          You have full control over the resources provisioned.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8">
        <div className="flex flex-col gap-6">
          <fieldset
            className="space-y-2 motion-safe:animate-revealBottom"
            style={{
              animationDuration: "500ms",
              animationDelay: `200ms`,
              animationFillMode: "backwards",
            }}
          >
            <legend className="font-medium text-gray-900 sm:text-sm dark:text-gray-50">
              Cloud provider
            </legend>
            <RadioCardGroup
              id="cloud-provider"
              value={cloudProvider}
              onValueChange={(value) =>
                setCloudProvider(value as "aws" | "azure")
              }
              className="mt-2 grid grid-cols-1 gap-4 sm:text-sm md:grid-cols-2"
              aria-label="Select cloud provider"
            >
              {Object.keys(regionOptions).map((provider) => {
                const Icon =
                  cloudProviderIcons[
                  provider as keyof typeof cloudProviderIcons
                  ]
                return (
                  <RadioCardItem key={provider} value={provider}>
                    <div>
                      <div className="flex items-center gap-2">
                        <Icon className="size-5 shrink-0" aria-hidden="true" />
                        <span className="font-semibold leading-6">
                          {provider.toUpperCase()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500 sm:text-xs dark:text-gray-500">
                        {
                          regionOptions[provider as keyof typeof regionOptions]
                            .length
                        }{" "}
                        regions available
                      </p>
                    </div>
                  </RadioCardItem>
                )
              })}
            </RadioCardGroup>
          </fieldset>

          <div
            className="flex flex-col items-start gap-8 motion-safe:animate-revealBottom sm:flex-row"
            style={{
              animationDuration: "500ms",
              animationDelay: `400ms`,
              animationFillMode: "backwards",
            }}
          >
            <div className="space-y-2">
              <Label
                className="whitespace-nowrap text-base font-medium text-gray-900 sm:text-sm/7 dark:text-gray-50"
                htmlFor="storage"
              >
                Storage (GB)
              </Label>
              <Input
                id="storage"
                type="number"
                min={6}
                max={128}
                value={storageVolume}
                onChange={(e) => setStorageVolume(Number(e.target.value))}
                aria-describedby="storage-description"
              />
              <p id="storage-description" className="sr-only">
                Enter storage volume between 6 and 128 GB
              </p>
            </div>
            <fieldset className="space-y-2">
              <legend className="block font-medium text-gray-900 sm:text-sm/7 dark:text-gray-50">
                Would you like to auto compress your data?
              </legend>
              <RadioGroup
                value={compression}
                onValueChange={(value) => {
                  setCompression(value)
                }}
                className="flex gap-6 pt-2.5"
              >
                <div className="flex items-center gap-x-3">
                  <RadioGroupItem value="true" id="compression-yes" />
                  <Label htmlFor="compression-yes">Yes</Label>
                </div>
                <div className="flex items-center gap-x-3">
                  <RadioGroupItem value="false" id="compression-no" />
                  <Label htmlFor="compression-no">No</Label>
                </div>
              </RadioGroup>
            </fieldset>
          </div>

          <div
            className="space-y-2 motion-safe:animate-revealBottom"
            style={{
              animationDuration: "500ms",
              animationDelay: `600ms`,
              animationFillMode: "backwards",
            }}
          >
            <Label
              className="text-base font-medium text-gray-900 sm:text-sm dark:text-gray-50"
              htmlFor="region"
            >
              Region
            </Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger id="region" className="w-full">
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {regionOptions[cloudProvider].map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex items-center gap-x-2">
                      {option.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            className="space-y-2 motion-safe:animate-revealBottom"
            style={{
              animationDuration: "500ms",
              animationDelay: `800ms`,
              animationFillMode: "backwards",
            }}
          >
            <Label
              className="text-base font-medium text-gray-900 sm:text-sm dark:text-gray-50"
              htmlFor="hours"
            >
              Active hours per day
            </Label>
            <div className="flex flex-nowrap gap-4">
              <Slider
                value={activeHours}
                onValueChange={setActiveHours}
                id="hours"
                defaultValue={[8]}
                max={24}
                step={1}
                aria-valuetext={`${activeHours[0]} hours`}
              />
              <div className="flex h-8 w-12 items-center justify-center rounded border border-gray-300 bg-white text-sm font-medium text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-50">
                <span aria-hidden="true">{activeHours}h</span>
              </div>
            </div>
          </div>

          <Card
            className="mt-4 space-y-1 border-gray-300 motion-safe:animate-revealBottom dark:border-gray-800"
            style={{
              animationDuration: "500ms",
              animationDelay: `1000ms`,
              animationFillMode: "backwards",
            }}
          >
            <p className="text-gray-700 sm:text-sm dark:text-gray-300">
              Estimated monthly cost
            </p>
            <p
              className="text-3xl font-medium text-gray-900 sm:text-2xl dark:text-gray-50"
              aria-live="polite"
            >
              {calculatePrice()}
            </p>
          </Card>

          <div className="mt-6 flex justify-between">
            <Button type="button" variant="ghost" asChild>
              <Link href="/onboarding/employees">Back</Link>
            </Button>
            <Button
              className="disabled:bg-gray-200 disabled:text-gray-500"
              type="submit"
              disabled={
                !cloudProvider ||
                !region ||
                !activeHours ||
                !storageVolume ||
                !compression ||
                loading
              }
              aria-disabled={
                !cloudProvider ||
                !region ||
                !activeHours ||
                !storageVolume ||
                !compression ||
                loading
              }
              isLoading={loading}
            >
              {loading ? "Submitting..." : "Continue"}
            </Button>
          </div>
        </div>
      </form>
    </main>
  )
}
