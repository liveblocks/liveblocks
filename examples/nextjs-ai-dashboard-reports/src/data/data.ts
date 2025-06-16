export const departments: { value: string; label: string }[] = [
  {
    value: "all-areas",
    label: "All areas",
  },
  {
    value: "IT",
    label: "IT",
  },
  {
    value: "sales",
    label: "Sales",
  },
  {
    value: "marketing",
    label: "Marketing",
  },
];

export const roles: { value: string; label: string }[] = [
  {
    value: "admin",
    label: "Admin",
  },
  {
    value: "member",
    label: "Member",
  },
  {
    value: "viewer",
    label: "Viewer",
  },
  {
    value: "contributor",
    label: "Contributor",
  },
];

export const currentPlan = {
  plan: "Team",
  planLabel: "Starter Tier (Start-Up Discount)",
  price: 100,
  priceUnit: "month",
  priceCurrency: "USD",
  billingPeriod: "monthly",
  billingPeriodRenewal: "2023-08-20",
  seatsUsed: 5,
  seatsLimit: 25,
};
