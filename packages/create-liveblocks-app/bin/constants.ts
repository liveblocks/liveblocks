export const LIVEBLOCKS_URL = "https://liveblocks.io";

export const EXAMPLES_REPO_LOCATION = "liveblocks/liveblocks/examples/";
export const EXAMPLES_URL =
  "https://github.com/liveblocks/liveblocks/tree/main/examples";

export const EXAMPLE_VERCEL_DEPLOYMENT_URL = (
  encodedData: string,
  projectName: string,
  exampleName: string
) =>
  `https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fliveblocks%2Fliveblocks%2Fblob%2Fmain%2Fexamples%2F${exampleName}&developer-id=oac_vgAdc0379wKPfhSvnUIZ4Vc8&integration-ids=oac_vgAdc0379wKPfhSvnUIZ4Vc8&external-id=${encodedData}&project-name=${projectName}&repository-name=${projectName}`;

export const EXAMPLE_VERCEL_DEPLOYMENT_URL_DEV = (
  encodedData: string,
  projectName: string,
  exampleName: string
) => {
  console.warn("Remove DEV URL");
  return `https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fliveblocks%2Fliveblocks%2Fblob%2Fmain%2Fexamples%2F${exampleName}&developer-id=oac_cem0SgRkffaXn20Xd8wYxl8V&integration-ids=oac_cem0SgRkffaXn20Xd8wYxl8V&external-id=${encodedData}&project-name=${projectName}&repository-name=${projectName}`;
};

export const LIVEBLOCKS_GENERAL_INTEGRATION_URL = (encodedData: string) =>
  `https://liveblocks.io/integrations/general?data=${encodedData}`;

export const LIVEBLOCKS_GENERAL_INTEGRATION_URL_DEV = (encodedData: string) => {
  console.warn("Remove DEV URL");
  return `http://localhost:3001/integrations/general?data=${encodedData}`;
};

export const NEXTJS_STARTER_KIT_VERCEL_DEPLOYMENT_URL = (
  encodedData: string,
  projectName: string
) =>
  `https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fliveblocks%2Fliveblocks%2Fblob%2Fmain%2Fstarter-kits%2Fnextjs-starter-kit&developer-id=oac_vgAdc0379wKPfhSvnUIZ4Vc8&demo-title=Liveblocks%20Starter%20Kit&demo-description=Kickstart%20your%20collaborative%20app%20with%20Liveblocks%20and%20Next.js&demo-url=https%3A%2F%2Fliveblocks.io%2Fdocs%2Fguides%2Fnextjs-starter-kit&demo-image=https%3A%2F%2Fliveblocks.io%2Fimages%2Fintegrations%2Fnextjs-starter-kit-preview.png&integration-ids=oac_vgAdc0379wKPfhSvnUIZ4Vc8&external-id=${encodedData}&project-name=${projectName}&repository-name=${projectName}`;

export const NEXTJS_STARTER_KIT_VERCEL_DEPLOYMENT_URL_DEV = (
  encodedData: string,
  projectName: string
) => {
  console.warn("Remove DEV URL");
  return `https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fliveblocks%2Fliveblocks%2Fblob%2Fmain%2Fstarter-kits%2Fnextjs-starter-kit&developer-id=oac_cem0SgRkffaXn20Xd8wYxl8V&demo-title=Liveblocks%20Starter%20Kit&demo-description=Kickstart%20your%20collaborative%20app%20with%20Liveblocks%20and%20Next.js&demo-url=https%3A%2F%2Fliveblocks.io%2Fdocs%2Fguides%2Fnextjs-starter-kit&demo-image=https%3A%2F%2Fliveblocks.io%2Fimages%2Fintegrations%2Fnextjs-starter-kit-preview.png&integration-ids=oac_cem0SgRkffaXn20Xd8wYxl8V&external-id=${encodedData}&project-name=${projectName}&repository-name=${projectName}`;
};

export const NEXTJS_STARTER_KIT_GUIDE_URL =
  "https://liveblocks.io/docs/guides/nextjs-starter-kit";
export const NEXTJS_STARTER_KIT_REPO_DIRECTORY =
  "liveblocks/liveblocks/starter-kits/nextjs-starter-kit";

export const NEXTJS_STARTER_KIT_AUTH_PROVIDERS = [
  "demo",
  "github",
  "auth0",
] as const;
