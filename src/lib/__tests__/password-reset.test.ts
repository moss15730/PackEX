import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { RESET_TOKEN_PATTERN, validatePasswordStrength } from "../password-reset";

describe("validatePasswordStrength", () => {
  it("accepts a reasonable password", () => {
    assert.equal(validatePasswordStrength("warehouse7pine"), null);
  });

  it("rejects short passwords", () => {
    assert.match(validatePasswordStrength("abc12345") ?? "", /10 ตัวอักษร/);
  });

  it("requires a letter and a digit", () => {
    assert.match(validatePasswordStrength("1234567890") ?? "", /ตัวอักษร/);
    assert.match(validatePasswordStrength("abcdefghij") ?? "", /ตัวเลข/);
  });

  it("rejects padded passwords that break on copy/paste", () => {
    assert.notEqual(validatePasswordStrength(" warehouse7pine "), null);
  });

  it("rejects the seed demo password and other guessable strings", () => {
    assert.notEqual(validatePasswordStrength("password123"), null);
    assert.notEqual(validatePasswordStrength("packexadmin1"), null);
    assert.notEqual(validatePasswordStrength("qwerty123456"), null);
  });
});

describe("reset token shape", () => {
  it("matches tokens produced the same way as the API", () => {
    for (let i = 0; i < 50; i += 1) {
      const token = randomBytes(24).toString("base64url");
      assert.match(token, RESET_TOKEN_PATTERN);
    }
  });

  it("rejects malformed tokens", () => {
    assert.equal(RESET_TOKEN_PATTERN.test(""), false);
    assert.equal(RESET_TOKEN_PATTERN.test("short"), false);
    assert.equal(RESET_TOKEN_PATTERN.test(`${"a".repeat(31)}+`), false);
    assert.equal(RESET_TOKEN_PATTERN.test("a".repeat(33)), false);
  });
});
