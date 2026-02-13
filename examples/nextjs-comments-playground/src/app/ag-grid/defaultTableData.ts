import { LiveList, LiveObject } from "@liveblocks/client";
import { nanoid } from "@liveblocks/core";

export type MarketingRow = {
  id: string;
  campaign: string;
  channel: string;
  region: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  cpc: number;
  ctr: number;
  conversionRate: number;
  roi: number;
  leads: number;
  pipelineValue: number;
};

const CAMPAIGNS = [
  "Q1 Brand Awareness",
  "Spring Product Launch",
  "Retargeting - Cart Abandoners",
  "Lead Gen - Webinars",
  "Demand Gen - Enterprise",
  "Holiday Promo",
  "Black Friday Blitz",
  "New User Acquisition",
  "Upsell - Premium Tier",
  "Partner Co-Marketing",
  "Event - Conference 2024",
  "Content Syndication",
  "Trial Conversion",
  "Customer Advocacy",
  "Regional Rollout",
  "Vertical - Healthcare",
  "Vertical - Finance",
  "Vertical - Retail",
  "Lifecycle - Win-back",
  "Lifecycle - Onboarding",
];

const CHANNELS = [
  "Paid Search",
  "Paid Social",
  "Display",
  "Video",
  "Email",
  "Organic Social",
  "Affiliate",
  "Partner",
  "Outbound",
  "Events",
  "Content",
  "SEO",
  "Direct",
  "Referral",
];

const REGIONS = ["North America", "EMEA", "APAC", "LATAM", "ANZ"];

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Creates a large default table of marketing/sales data as a LiveList of LiveObjects.
 * Use this as initialStorage.rowData in RoomProvider.
 */
export function createDefaultRowData(): LiveList<LiveObject<MarketingRow>> {
  const rows: LiveObject<MarketingRow>[] = [];
  const targetSize = 13;
  // const targetSize = 280;

  for (let i = 0; i < targetSize; i++) {
    const spend = round2(randomInRange(500, 850000));
    const impressions = Math.floor(randomInRange(10000, 12000000));
    const clicks = Math.floor(randomInRange(200, 450000));
    const conversions = Math.floor(randomInRange(5, 12000));
    const revenue = round2(randomInRange(1000, 2200000));
    const leads = Math.floor(randomInRange(10, 8500));
    const pipelineValue = round2(randomInRange(5000, 5000000));

    const cpc = clicks > 0 ? round2(spend / clicks) : 0;
    const ctr = impressions > 0 ? round2((clicks / impressions) * 100) : 0;
    const conversionRate =
      clicks > 0 ? round2((conversions / clicks) * 100) : 0;
    const roi = spend > 0 ? round2(((revenue - spend) / spend) * 100) : 0;

    rows.push(
      new LiveObject<MarketingRow>({
        id: nanoid(),
        campaign: pick(CAMPAIGNS),
        channel: pick(CHANNELS),
        region: pick(REGIONS),
        spend,
        impressions,
        clicks,
        conversions,
        revenue,
        cpc,
        ctr,
        conversionRate,
        roi,
        leads,
        pipelineValue,
      })
    );
  }

  return new LiveList(rows);
}
