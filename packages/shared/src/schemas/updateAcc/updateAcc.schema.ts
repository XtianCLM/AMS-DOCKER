import { z } from "zod";


export const updateAccSchema = z
  .object({
    email: z
      .string()
      .email("Invalid email address")
      .optional(),

    // API/database format:
    // +639XXXXXXXXX
    agentTel: z
      .string()
      .trim()
      .regex(
        /^\+639\d{9}$/,
        "Enter a valid Philippine mobile number."
      ),

    password: z.string().optional(),

    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.password) return true;

      return (
        data.password.length >= 8 &&
        /^(?=.*[A-Z])(?=.*\d).+$/.test(
          data.password
        )
      );
    },
    {
      path: ["password"],
      message:
        "Password must contain at least 8 characters, 1 uppercase letter and 1 number",
    }
  )
  .refine(
    (data) => {
      if (!data.password) return true;

      return (
        data.password ===
        data.confirmPassword
      );
    },
    {
      path: ["confirmPassword"],
      message: "Passwords do not match",
    }
  );

export type UpdateAgentAccSchema =
  z.infer<typeof updateAccSchema>;

export const updateAdminAccSchema = z
  .object({
    email: z
      .string()
      .email("Invalid email address")
      .optional(),


    password: z.string().optional(),

    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.password) return true;

      return (
        data.password.length >= 8 &&
        /^(?=.*[A-Z])(?=.*\d).+$/.test(
          data.password
        )
      );
    },
    {
      path: ["password"],
      message:
        "Password must contain at least 8 characters, 1 uppercase letter and 1 number",
    }
  )
  .refine(
    (data) => {
      if (!data.password) return true;

      return (
        data.password ===
        data.confirmPassword
      );
    },
    {
      path: ["confirmPassword"],
      message: "Passwords do not match",
    }
  );

export type UpdateAdminAccSchema =
  z.infer<typeof updateAdminAccSchema>;


export const updateAgentFormSchema = z
  .object({
    email: z
      .string()
      .email("Invalid email address")
      .optional(),

    // Form format:
    // 9XXXXXXXXX
    agentTel: z
      .string()
      .trim()
      .regex(
        /^9\d{9}$/,
        "Enter a valid Philippine mobile number."
      ),

    password: z.string().optional(),

    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.password) return true;

      return (
        data.password.length >= 8 &&
        /^(?=.*[A-Z])(?=.*\d).+$/.test(
          data.password
        )
      );
    },
    {
      path: ["password"],
      message:
        "Password must contain at least 8 characters, 1 uppercase letter and 1 number",
    }
  )
  .refine(
    (data) => {
      if (!data.password) return true;

      return (
        data.password ===
        data.confirmPassword
      );
    },
    {
      path: ["confirmPassword"],
      message: "Passwords do not match",
    }
  );

export type UpdateAgentFormSchema =
  z.infer<typeof updateAgentFormSchema>;
