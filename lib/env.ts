const requiredEnvVars = [
  "DATABASE_URL",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "APP_URL"
] as const;

type RequiredEnvVar = (typeof requiredEnvVars)[number];

function getEnvVar(name: RequiredEnvVar): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getOptionalEnvVar(name: string): string | undefined {
  const value = process.env[name];
  return value ? value : undefined;
}

export const env = {
  DATABASE_URL: getEnvVar("DATABASE_URL"),
  STRIPE_SECRET_KEY: getEnvVar("STRIPE_SECRET_KEY"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: getEnvVar("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
  STRIPE_WEBHOOK_SECRET: getEnvVar("STRIPE_WEBHOOK_SECRET"),
  APP_URL: getEnvVar("APP_URL"),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: getOptionalEnvVar("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
  GOOGLE_PRIVATE_KEY: getOptionalEnvVar("GOOGLE_PRIVATE_KEY"),
  GOOGLE_SHEET_ID: getOptionalEnvVar("GOOGLE_SHEET_ID")
};
