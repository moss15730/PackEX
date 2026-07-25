import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MAX_MESSAGE_LENGTH, sanitizeMessage } from "../support-chat";
import { READ_ONLY_MESSAGES, readOnlyMessage } from "../tenant-access";

describe("sanitizeMessage", () => {
  it("trims surrounding whitespace", () => {
    assert.equal(sanitizeMessage("  สวัสดีครับ  "), "สวัสดีครับ");
  });

  it("rejects empty or whitespace-only messages", () => {
    assert.equal(sanitizeMessage(""), null);
    assert.equal(sanitizeMessage("   \n  "), null);
  });

  it("rejects non-string payloads", () => {
    assert.equal(sanitizeMessage(undefined), null);
    assert.equal(sanitizeMessage(42), null);
    assert.equal(sanitizeMessage({ body: "hi" }), null);
  });

  it("caps very long messages instead of failing", () => {
    const long = "ก".repeat(MAX_MESSAGE_LENGTH + 500);
    const result = sanitizeMessage(long);
    assert.equal(result?.length, MAX_MESSAGE_LENGTH);
  });

  it("keeps newlines inside the message", () => {
    assert.equal(sanitizeMessage("บรรทัด 1\nบรรทัด 2"), "บรรทัด 1\nบรรทัด 2");
  });
});

describe("readOnlyMessage", () => {
  it("explains every restriction reason", () => {
    for (const reason of Object.keys(READ_ONLY_MESSAGES) as (keyof typeof READ_ONLY_MESSAGES)[]) {
      const message = readOnlyMessage(reason);
      assert.ok(message.length > 10, `${reason} needs a real explanation`);
    }
  });

  it("tells an expired trial how to get unblocked", () => {
    assert.match(readOnlyMessage("trial_expired"), /ติดต่อผู้ดูแลระบบ/);
  });

  it("returns nothing when the tenant can write", () => {
    assert.equal(readOnlyMessage(null), "");
  });
});
