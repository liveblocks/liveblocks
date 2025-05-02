export const siteConfig = {
  name: "Insights",
  url: "https://insights.tremor.so",
  description: "The only reporting and audit dashboard you will ever need.",
  baseLinks: {
    reports: "/reports",
    transactions: "/transactions",
    settings: {
      audit: "/settings/audit",
      users: "/settings/users",
      billing: "/settings/billing",
    },
    login: "/login",
    onboarding: "/onboarding/products",
  },
}

export type siteConfig = typeof siteConfig
