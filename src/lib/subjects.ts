import { createSubjects } from "@openauthjs/openauth/subject";
import { object, string } from "valibot";

export const subjects = createSubjects({
  user: object({
    id: string(),
  }),
});

export type Subject = (typeof subjects)[keyof typeof subjects];
