import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required.").max(100, "Username is too long."),
  school_code: z.string().trim().max(100, "School code is too long.").optional(),
  password: z.string().min(1, "Password is required.").max(500, "Password is too long."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
