import { GetServerSideProps } from "next";
import { getProviders } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { AuthenticationLayout } from "../layouts/Authentication";
import { useSession } from "next-auth/react";
import * as Server from "../lib/server";

interface Props {
  providers: Awaited<ReturnType<typeof getProviders>>;
}

export default function SignIn({ providers }: Props) {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.replace("/");
    }
  }, [router, session]);

  return <AuthenticationLayout providers={providers} />;
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const session = await Server.getServerSession(req, res);

  // If logged in, go to dashboard
  if (session) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  // Get NextAuth providers from your [...nextAuth.ts] file
  const providers = await getProviders();

  return {
    props: { providers },
  };
};
