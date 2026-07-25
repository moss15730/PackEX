import * as Sentry from "@sentry/nextjs";

/**
 * Error tracking stays completely inert unless SENTRY_DSN is configured, so
 * local development and self-hosted installs need no extra setup.
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  const common = {
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    // Evidence links, tokens and tenant payloads must never leave the platform.
    sendDefaultPii: false,
  };

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init(common);
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init(common);
  }
}

export const onRequestError = Sentry.captureRequestError;
