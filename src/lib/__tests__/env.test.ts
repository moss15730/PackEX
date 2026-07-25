import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkProductionEnv, getMaxUploadBytes } from "../env";

const snapshot = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in snapshot)) delete process.env[key];
  }
  Object.assign(process.env, snapshot);
});

describe("getMaxUploadBytes", () => {
  it("stays under the Vercel/Supabase ceiling even if env asks for more", () => {
    process.env.SUPABASE_FILE_SIZE_LIMIT = String(500 * 1024 * 1024);
    assert.equal(getMaxUploadBytes(), 48 * 1024 * 1024);
  });

  it("enforces a sane floor", () => {
    process.env.SUPABASE_FILE_SIZE_LIMIT = "10";
    assert.equal(getMaxUploadBytes(), 1_000_000);
  });

  it("defaults to 48MB when unset", () => {
    delete process.env.SUPABASE_FILE_SIZE_LIMIT;
    assert.equal(getMaxUploadBytes(), 48 * 1024 * 1024);
  });
});

describe("checkProductionEnv", () => {
  it("flags the example AUTH_SECRET as unusable", () => {
    process.env.AUTH_SECRET = "generate-a-random-secret-at-least-32-chars";
    const issues = checkProductionEnv();
    assert.ok(issues.some((i) => i.key === "AUTH_SECRET"));
  });

  it("flags a too-short AUTH_SECRET", () => {
    process.env.AUTH_SECRET = "short";
    const issues = checkProductionEnv();
    assert.ok(issues.some((i) => i.key === "AUTH_SECRET" && /32/.test(i.message)));
  });

  it("reports missing storage configuration", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const issues = checkProductionEnv();
    assert.ok(issues.some((i) => i.key === "NEXT_PUBLIC_SUPABASE_URL"));
    assert.ok(issues.some((i) => i.key === "SUPABASE_SERVICE_ROLE_KEY"));
  });

  it("is clean when everything is set properly", () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/packex";
    process.env.AUTH_SECRET = "a".repeat(48);
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.CRON_SECRET = "cron-secret";
    process.env.STATION_AGENT_KEY = "agent-key";
    assert.deepEqual(checkProductionEnv(), []);
  });
});
