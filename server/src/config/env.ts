import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CORS_ORIGINS: z.string().default(""),
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  const invalidKeys = parsedEnvironment.error.issues
    .map((issue) => issue.path.join("."))
    .join(", ");
  throw new Error(`Invalid server environment configuration: ${invalidKeys}`);
}

export const env = parsedEnvironment.data;

export const corsOrigins = new Set(
  env.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);
