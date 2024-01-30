import type { GetServerSidePropsContext } from "next";
import { getServerSession as session } from "next-auth/next";
import { authOptions } from "../../../pages/api/auth/[...nextauth]";

export function getServerSession(
  req: GetServerSidePropsContext["req"],
  res: GetServerSidePropsContext["res"]
) {
  return session(req, res, authOptions);
}
