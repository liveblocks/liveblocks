import type { GetServerSidePropsContext } from "next";
import { getServerSession as getNextAuthServerSession } from "next-auth/next";
import { authOptions } from "../../../pages/api/auth/[...nextauth]";

export function getServerSession(
  req: GetServerSidePropsContext["req"],
  res: GetServerSidePropsContext["res"]
) {
  return getNextAuthServerSession(req, res, authOptions);
}
