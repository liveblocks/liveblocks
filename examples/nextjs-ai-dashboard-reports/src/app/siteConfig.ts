export const siteConfig = {
  name: "Liveblocks",
  url: "https://nextjs-ai-dashboard-reports.liveblocks.app",
  description: "The only reporting and audit dashboard you will ever need.",
  baseLinks: {
    reports: "/reports",
    transactions: "/transactions",
    invoices: "/invoices",
    settings: {
      users: "/settings/users",
      billing: "/settings/billing",
    },
  },
};

export type siteConfig = typeof siteConfig;
