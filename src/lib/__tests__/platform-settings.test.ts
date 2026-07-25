import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_TRIAL_POLICY, SLUG_PATTERN, validateSlug } from "../platform-settings";

describe("validateSlug", () => {
  it("accepts normal organisation slugs", () => {
    for (const slug of ["acme", "my-warehouse", "pack123", "a1b"]) {
      const result = validateSlug(slug);
      assert.equal(result.ok, true, `${slug} should be valid`);
    }
  });

  it("lowercases and trims input", () => {
    const result = validateSlug("  MyWarehouse  ");
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.slug, "mywarehouse");
  });

  it("rejects slugs that would collide with app routes", () => {
    for (const slug of ["api", "platform", "login", "signup", "share", "admin"]) {
      const result = validateSlug(slug);
      assert.equal(result.ok, false, `${slug} must be reserved`);
    }
  });

  it("rejects malformed slugs", () => {
    for (const slug of ["ab", "-lead", "trail-", "has space", "UPPER!", "a".repeat(40)]) {
      assert.equal(validateSlug(slug).ok, false, `${slug} must be rejected`);
    }
  });

  it("pattern and validator agree", () => {
    assert.equal(SLUG_PATTERN.test("my-warehouse"), true);
    assert.equal(SLUG_PATTERN.test("no"), false);
  });
});

describe("default trial policy", () => {
  it("ships a bounded 7-day trial", () => {
    assert.equal(DEFAULT_TRIAL_POLICY.trialDays, 7);
    assert.equal(DEFAULT_TRIAL_POLICY.signupEnabled, true);
    assert.ok((DEFAULT_TRIAL_POLICY.trialMaxStations ?? 0) > 0);
    assert.ok((DEFAULT_TRIAL_POLICY.trialMaxStorageGb ?? 0) > 0);
    assert.ok((DEFAULT_TRIAL_POLICY.trialMaxUsers ?? 0) > 0);
  });
});
