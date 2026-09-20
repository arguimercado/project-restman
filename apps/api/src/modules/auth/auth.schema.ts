import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  // Clerk enforces its own password policy (length, breached passwords); this is the floor.
  password: z.string().min(8).max(128),
  companyName: z.string().trim().min(1).max(200),
  teamName: z.string().trim().min(1).max(200),
});

export type RegisterInput = z.infer<typeof registerSchema>;
