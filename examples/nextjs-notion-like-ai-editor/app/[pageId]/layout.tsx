// Force the page to be dynamic and allow streaming responses up to 30 seconds for AI
import { ReactNode } from "react";
import DefaultLayout from "../components/DefaultLayout";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const revalidate = 0;

export default async function Layout({ children }: { children: ReactNode }) {
  return <DefaultLayout>{children}</DefaultLayout>;
}
