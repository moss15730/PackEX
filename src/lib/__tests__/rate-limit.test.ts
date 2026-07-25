import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  __resetLocalBuckets,
  clientIp,
  pruneRateLimitBuckets,
  rateLimit,
} from "../rate-limit";

beforeEach(() => __resetLocalBuckets());

describe("rateLimit", () => {
  it("allows requests up to the limit then blocks", () => {
    const opts = { key: "test", limit: 3, windowMs: 60_000 };
    assert.equal(rateLimit(opts).ok, true);
    assert.equal(rateLimit(opts).ok, true);
    assert.equal(rateLimit(opts).ok, true);

    const blocked = rateLimit(opts);
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.ok(blocked.retryAfterSec > 0);
  });

  it("tracks keys independently", () => {
    const a = { key: "ip-a", limit: 1, windowMs: 60_000 };
    const b = { key: "ip-b", limit: 1, windowMs: 60_000 };
    assert.equal(rateLimit(a).ok, true);
    assert.equal(rateLimit(a).ok, false);
    assert.equal(rateLimit(b).ok, true);
  });

  it("starts a fresh window once the old one expires", async () => {
    const opts = { key: "expiring", limit: 1, windowMs: 20 };
    assert.equal(rateLimit(opts).ok, true);
    assert.equal(rateLimit(opts).ok, false);
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(rateLimit(opts).ok, true);
  });
});

describe("pruneRateLimitBuckets", () => {
  it("drops only expired buckets", async () => {
    rateLimit({ key: "old", limit: 1, windowMs: 10 });
    rateLimit({ key: "fresh", limit: 1, windowMs: 60_000 });
    await new Promise((resolve) => setTimeout(resolve, 20));

    pruneRateLimitBuckets();

    // "old" was pruned so its budget resets; "fresh" is still counted.
    assert.equal(rateLimit({ key: "old", limit: 1, windowMs: 10 }).ok, true);
    assert.equal(rateLimit({ key: "fresh", limit: 1, windowMs: 60_000 }).ok, false);
  });
});

describe("clientIp", () => {
  it("takes the first entry of x-forwarded-for", () => {
    const req = new Request("https://packex.app", {
      headers: { "x-forwarded-for": "203.0.113.7, 70.41.3.18" },
    });
    assert.equal(clientIp(req), "203.0.113.7");
  });

  it("falls back to x-real-ip then unknown", () => {
    assert.equal(
      clientIp(new Request("https://packex.app", { headers: { "x-real-ip": "198.51.100.5" } })),
      "198.51.100.5",
    );
    assert.equal(clientIp(new Request("https://packex.app")), "unknown");
  });
});
