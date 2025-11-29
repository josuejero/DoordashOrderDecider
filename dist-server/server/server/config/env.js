// server/config/env.ts
import { z } from "zod";
const EnvSchema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),
    PORT: z.coerce.number().default(Number(process.env.DD_DECIDER_API_PORT || 4000)),
    DATABASE_URL: z
        .string()
        .default(process.env.DD_DECIDER_DEV_DB_URL ??
        "postgres://localhost:5432/doordash_decider_dev"),
});
export function loadEnv() {
    return EnvSchema.parse(process.env);
}
