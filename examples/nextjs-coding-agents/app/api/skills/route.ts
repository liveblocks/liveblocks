import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadSkills } from "@/lib/server/skills";
import type { SkillSummary } from "@/lib/skills";

/**
 * The skills in the `skills/` directory, for the "/" menu in the composer
 * and the chips in messages. Instructions stay on the server; they only go
 * into the agent's prompt.
 */
export async function GET() {
  if (!(await auth())) {
    return new NextResponse("Not signed in", { status: 401 });
  }

  return NextResponse.json(
    loadSkills().map(
      ({ id, name, description }): SkillSummary => ({ id, name, description })
    )
  );
}
