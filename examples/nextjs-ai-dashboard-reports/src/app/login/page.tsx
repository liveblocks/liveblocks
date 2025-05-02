"use client"

import { Button } from "@/components/Button"
import { Divider } from "@/components/Divider"
import { Input } from "@/components/Input"
import { Label } from "@/components/Label"
import { Logo } from "@/components/ui/Logo"
import { RiGithubFill, RiGoogleFill } from "@remixicon/react"
import { useRouter } from "next/navigation"
import React from "react"

export default function Login() {

  const [loading, setLoading] = React.useState(false)
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      console.log("Form submitted")
      router.push("/reports")
    }, 1200)
  }

  const router = useRouter()
  return (
    <div className="flex min-h-dvh items-center justify-center p-4 sm:p-6">
      <div className="flex w-full flex-col items-start sm:max-w-sm">
        <div className="relative flex items-center justify-center rounded-lg bg-white p-3 shadow-lg ring-1 ring-black/5">
          <Logo
            className="size-8 text-blue-500 dark:text-blue-500"
            aria-label="Insights logo"
          />
        </div>
        <div className="mt-6 flex flex-col">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            Log in to Insights
          </h1>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
            Don&rsquo;t have an account?{" "}
            <a
              className="text-blue-500 hover:text-blue-600 dark:text-blue-500 hover:dark:text-blue-400"
              href="#"
            >
              Sign up
            </a>
          </p>
        </div>
        <div className="mt-10 w-full">
          <div className="gap-2 sm:flex sm:flex-row sm:items-center">
            <Button asChild variant="secondary" className="w-full">
              <a href="#" className="inline-flex items-center gap-2">
                <RiGithubFill className="size-5 shrink-0" aria-hidden="true" />
                Login with GitHub
              </a>
            </Button>
            <Button asChild variant="secondary" className="mt-2 w-full sm:mt-0">
              <a href="#" className="inline-flex items-center gap-2">
                <RiGoogleFill className="size-4" aria-hidden="true" />
                Login with Google
              </a>
            </Button>
          </div>
          <Divider className="my-6">or</Divider>
          <form
            onSubmit={handleSubmit}
            className="flex w-full flex-col gap-y-6"
          >
            <div className="flex flex-col gap-y-4">
              <div className="flex flex-col space-y-2">
                <Label htmlFor="email-form-item" className="font-medium">
                  Email
                </Label>
                <Input
                  type="email"
                  autoComplete="email"
                  name="email"
                  id="email-form-item"
                  placeholder="emily.ross@acme.ch"
                />
              </div>
              <div className="flex flex-col space-y-2">
                <Label htmlFor="password-form-item" className="font-medium">
                  Password
                </Label>
                <Input
                  type="password"
                  autoComplete="current-password"
                  name="password"
                  id="password-form-item"
                  placeholder="Password"
                />
              </div>
            </div>
            <Button
              type="submit"
              isLoading={loading}
            >
              {loading ? "" : "Continue"}
            </Button>
          </form>
        </div>
        <Divider />
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Forgot your password?{" "}
          <a
            className="text-blue-500 hover:text-blue-600 dark:text-blue-500 hover:dark:text-blue-400"
            href="#"
          >
            Reset password
          </a>
        </p>
      </div>
    </div>
  )
}
