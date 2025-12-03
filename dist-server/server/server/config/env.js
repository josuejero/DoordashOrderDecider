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
    ENABLE_HYBRID_ML: z
        .preprocess((v) => (v === "true" || v === true ? true : false), z.boolean())
        .default(false),
    ML_SERVICE_URL: z
        .string()
        .default(process.env.ML_SERVICE_URL ?? "http://localhost:8000"),
    ML_SERVICE_TIMEOUT_MS: z.coerce.number().default(Number(process.env.ML_SERVICE_TIMEOUT_MS ?? 75)),
    ENABLE_ANALYTICS_API: z.preprocess((val) => {
        if (val === undefined)
            return true; // default: enabled
        if (typeof val === "string") {
            const normalized = val.toLowerCase().trim();
            return (normalized === "1" ||
                normalized === "true" ||
                normalized === "yes" ||
                normalized === "y");
        }
        return Boolean(val);
    }, z.boolean()),
});
export function loadEnv() {
    return EnvSchema.parse(process.env);
}
