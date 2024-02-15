import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

export const envConfigSchema = z.object({
  // DATABASE_URL_PG: z.string(),
  NODE_ENV: z.string().default("development"),
});

export type EnvConfigType = z.infer<typeof envConfigSchema>;

export let env: EnvConfigType;
try {
  env = envConfigSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    // DATABASE_URL_PG: process.env.DATABASE_URL_PG,
  });
} catch (err: any) {
  console.log("error parsing env vars");
  throw new Error(err);
}
