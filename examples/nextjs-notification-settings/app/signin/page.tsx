import { redirect } from "next/navigation";

import { auth } from "@/auth/manager";
import { SignIn } from "./_components/signin";

export default async function Page() {
  const session = await auth();
  if (session) {
    redirect("/");
  }
  return (
    <div className="flex flex-col w-full items-center justify-center flex-1">
      <SignIn />
    </div>
  );
}
