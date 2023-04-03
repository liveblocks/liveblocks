import styles from "../styles/SignIn.module.css";

import { GetServerSideProps } from "next";
import { getProviders } from "next-auth/react";
import { useSession, signIn } from "next-auth/react";
import { getServerSession } from "./api/auth/getServerSession";
import Button from "../components/Button";
import GoogleIcon from "../public/icons/google.svg";

interface Props {
  providers: Awaited<ReturnType<typeof getProviders>>;
}

export default function login({ providers }: Props) {
  const { data: session } = useSession();
  if (!session)
    return (
      <div className={styles.signin}>
        <Button
          className={styles.googlebutton}
          appearance="secondary"
          onClick={() => signIn("google")}
        >
          <GoogleIcon />
          Sign in with Google
        </Button>
      </div>
    );
}

// If not logged in redirect to signin
export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const session = await getServerSession(req, res);
  const providers = await getProviders();

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
