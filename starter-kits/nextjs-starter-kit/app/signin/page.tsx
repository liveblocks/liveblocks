import { redirect } from "next/navigation";
import { auth, getProviders } from "@/auth";
import { DASHBOARD_URL } from "@/constants";
import { AuthenticationLayout } from "@/layouts/Authentication";

export default async function SignInPage({}) {
  const session = await auth();

  // If logged in, go to dashboard
  if (session) {
    redirect(DASHBOARD_URL);
  }

  const providers = await getProviders();
  return <AuthenticationLayout providers={providers} />;
}
