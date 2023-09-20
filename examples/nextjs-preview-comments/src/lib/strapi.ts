import { Article, Marketing, Payload } from "@/types";

const STRAPI_BASE_URL = process.env.STRAPI_BASE_URL;

export async function getArticles() {
  const response = await fetch(`${STRAPI_BASE_URL}/api/articles`);

  if (!response.ok) {
    throw Error("Error fetching Articles");
  }

  return ((await response.json()) as Payload<Article[]>).data;
}

export async function getArticle(slug: string) {
  const response = await fetch(
    `${STRAPI_BASE_URL}/api/articles?filters[Slug][$eq]=${slug}`
  );

  if (!response.ok) {
    throw Error("Error fetching Article");
  }

  return ((await response.json()) as Payload<Article[]>).data[0];
}

export async function getMarketingText() {
  const response = await fetch(`${STRAPI_BASE_URL}/api/marketing-text`);

  if (!response.ok) {
    throw Error("Error fetching Marketing");
  }

  return ((await response.json()) as Payload<Marketing>).data;
}

export async function updateMarketingText(data: Marketing["attributes"]) {
  const body = JSON.stringify({ data });
  const response = await fetch(`${STRAPI_BASE_URL}/api/marketing-text`, {
    method: "PUT",
    body,
  });

  if (!response.ok) {
    throw Error("Error updating Marketing");
  }

  return ((await response.json()) as Payload<Marketing>).data;
}

export async function getStrapiData(strapiApiId: string) {
  const response = await fetch(`${STRAPI_BASE_URL}/api/${strapiApiId}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw Error("Error fetching Strapi data");
  }

  return ((await response.json()) as Payload<any>).data;
}

export async function updateStrapiData(
  strapiApiId: string,
  attributeChanges: Record<string, string>
) {
  const body = JSON.stringify({ data: attributeChanges });
  const response = await fetch(`${STRAPI_BASE_URL}/api/${strapiApiId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });

  if (!response.ok) {
    console.log(body);
    console.log(await response.json());
    throw Error("Error updating Strapi data");
  }

  return ((await response.json()) as Payload<any>).data;
}
