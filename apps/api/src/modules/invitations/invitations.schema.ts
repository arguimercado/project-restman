import { z } from "zod";

export const createInviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
