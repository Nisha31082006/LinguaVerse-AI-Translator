import { z } from "zod";

export const updateStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

export const updateRoleSchema = z.object({
  role: z.enum(["USER", "ADMIN"]),
});
