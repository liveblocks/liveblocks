"use client";

import { useEffect, useState } from "react";
import type { SkillSummary } from "@/lib/skills";

// Skills only change with a deploy (or a file added in development), so one
// fetch per page load is plenty. Kept module-level so every composer and
// message chip shares it.
let skills$: Promise<SkillSummary[]> | undefined;
let loaded: SkillSummary[] | undefined;

export function fetchSkills(): Promise<SkillSummary[]> {
  skills$ ??= fetch("/api/skills")
    .then(async (response) => {
      if (!response.ok) {
        return [];
      }
      // Shape is defined by /api/skills
      return (await response.json()) as SkillSummary[];
    })
    .catch((): SkillSummary[] => [])
    .then((skills) => {
      loaded = skills;
      return skills;
    });
  return skills$;
}

/** The available skills; empty until loaded */
export function useSkills(): SkillSummary[] {
  const [skills, setSkills] = useState<SkillSummary[]>(loaded ?? []);

  useEffect(() => {
    let cancelled = false;
    void fetchSkills().then((result) => {
      if (!cancelled) {
        setSkills(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return skills;
}
