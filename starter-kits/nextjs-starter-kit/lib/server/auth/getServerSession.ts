import type { GetServerSidePropsContext } from "next";
import { unstable_getServerSession } from "next-auth/next";
import { authOptions } from "../../../pages/api/auth/[...nextauth]";

export function getServerSession(
  req: GetServerSidePropsContext["req"],
  res: GetServerSidePropsContext["res"]
) {
  return unstable_getServerSession(req, res, authOptions);
}
