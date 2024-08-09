import { z } from "zod";

export const userSchemaZod = z.object({
  name: z
    .string()
    .min(4, "Name should have at least 4 characters")
    .max(30, "Name cannot exceed 30 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string(),
  avatar: z
    .object({
      public_id: z.string().optional(),
      url: z.string().url("Invalid URL format").optional(),
    })
    .optional(),
  role: z.string(),
  resetPasswordToken: z.string().optional(),
  resetPasswordExpire: z.date().optional(),
});
