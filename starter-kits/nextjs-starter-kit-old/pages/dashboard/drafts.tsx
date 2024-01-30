import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { Session } from "next-auth";
import { AuthenticatedLayout } from "../../layouts/Authenticated";
import { DashboardLayout } from "../../layouts/Dashboard";
import { DocumentsLayout } from "../../layouts/Documents";
import * as Server from "../../lib/server";
import { Group } from "../../types";

export default function Drafts({
  groups,
  session,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <AuthenticatedLayout session={session}>
      <DashboardLayout groups={groups}>
        <DocumentsLayout filter="drafts" />
      </DashboardLayout>
    </AuthenticatedLayout>
  );
}

interface ServerSideProps {
  groups: Group[];
  session: Session;
}

// Authenticate on server and retrieve a list of the current user's groups
export const getServerSideProps: GetServerSideProps<ServerSideProps> = async ({
  req,
  res,
}) => {
  const session = await Server.getServerSession(req, res);

  // If not logged in, redirect to marketing page
  if (!session) {
    return {
      redirect: {
        permanent: false,
        destination: "/",
      },
    };
  }

  const groups = await Server.getGroups(session?.user.info.groupIds ?? []);

  return {
    props: { groups, session },
  };
};
