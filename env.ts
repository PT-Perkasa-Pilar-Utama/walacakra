import { z } from "zod";

/**
 * A helper function to transform a comma-separated string from the .env file
 * into a clean array of strings. It splits the string by commas, trims whitespace
 * from each item, and filters out any empty strings.
 * @param val The string value from the environment variable.
 * @returns An array of strings.
 */
const toArray = (val: string | undefined) => {
  if (!val) return [];
  return val
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const EnvSchema = z.object({
  API_PORT: z.coerce.number().int().positive().default(8900),
  OLLAMA_URL: z.url().default("http://localhost:11434"),
  GEMINI_API_KEY: z.string().min(32).default(""),
  OPENAI_API_KEY: z.string().min(32).default(""),
});

export type Env = z.infer<typeof EnvSchema>;
const parsedEnv = EnvSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    "❌ Invalid environment variables:",
    JSON.stringify(parsedEnv.error.flatten().fieldErrors, null, 2)
  );
  process.exit(1);
}

export const env: Env = parsedEnv.data;
export default env;