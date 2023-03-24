import styles from "../src/components/SignIn.module.css";

import { GetServerSideProps } from "next";
import { getProviders } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { getServerSession } from "./api/auth/getServerSession";
import MoonIcon from "../src/icons/moon.svg";

interface Props {
  providers: Awaited<ReturnType<typeof getProviders>>;
}

export default function login({ providers }: Props) {
  const { data: session } = useSession();
  console.log(session);
  console.log("the props", providers);
  if (!session)
    return (
      <div className={styles.signin}>
        <p> You are not signed in.</p>
        <button
          className={styles.googlebutton}
          onClick={() => signIn("google")}
        >
          <img src="/google-images/btn_google_signin_light_normal_web@2x.png" />
        </button>
      </div>
    );
}

// If not logged in redirect to signin
export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const session = await getServerSession(req, res);
  const providers = await getProviders();
  console.log(providers);

  if (session) {
    return {
      redirect: {
        permanent: false,
        destination: "/",
      },
    };
  }

  return {
    props: { providers },
  };
};

// interface Props {
//   providers: Awaited<ReturnType<typeof getProviders>>;
// }

// export default function SignIn({ providers }: Props) {
//   const { data: session } = useSession();
//   const router = useRouter();

//   useEffect(() => {
//     if (session) {
//       router.replace("/");
//     }
//   }, [router, session]);

//   return <AuthenticationLayout providers={providers} />;
// }

// export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
//   const session = await getServerSession(req, res);

//   // If logged in, go to dashboard
//   if (session) {
//     return {
//       redirect: {
//         destination: "/",
//         permanent: false,
//       },
//     };
//   }

//   // Get NextAuth providers from your [...nextAuth.ts] file
//   const providers = await getProviders();

//   return {
//     props: { providers },
//   };
// };
