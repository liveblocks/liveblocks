const STRAPI_BASE_URL = process.env.STRAPI_BASE_URL;

export interface Payload<T> {
  data: T;
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export async function getStrapiData(strapiApiId: string) {
  const response = await fetch(`${STRAPI_BASE_URL}/api/${strapiApiId}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    console.log(await response.json());
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
    cache: "no-store",
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });

  if (!response.ok) {
    console.log(await response.json());
    throw Error("Error updating Strapi data");
  }

  return ((await response.json()) as Payload<any>).data;
}
