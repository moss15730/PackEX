import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatBytes, roleLabel, statusLabel, statusTone } from "../utils";

describe("formatBytes", () => {
  it("keeps small sizes in bytes", () => {
    assert.equal(formatBytes(0), "0 B");
    assert.equal(formatBytes(1023), "1023 B");
  });

  it("switches unit at each 1024 boundary", () => {
    assert.equal(formatBytes(1024), "1.0 KB");
    assert.equal(formatBytes(1024 ** 2), "1.0 MB");
    assert.equal(formatBytes(1024 ** 3), "1.00 GB");
  });

  it("formats a realistic clip size", () => {
    assert.equal(formatBytes(45 * 1024 * 1024), "45.0 MB");
  });
});

describe("statusTone", () => {
  it("maps healthy states to success", () => {
    assert.equal(statusTone("ready"), "success");
    assert.equal(statusTone("active"), "success");
  });

  it("maps failures to danger", () => {
    assert.equal(statusTone("offline"), "danger");
    assert.equal(statusTone("disk_full"), "danger");
    assert.equal(statusTone("camera_error"), "danger");
  });

  it("gives recording its own tone", () => {
    assert.equal(statusTone("recording"), "rec");
  });

  it("falls back to neutral for unknown states", () => {
    assert.equal(statusTone("something-new"), "neutral");
  });
});

describe("labels", () => {
  it("translates known statuses", () => {
    assert.equal(statusLabel("recording"), "กำลังอัด");
    assert.equal(statusLabel("disk_full"), "ดิสก์เต็ม");
  });

  it("passes unknown values through unchanged", () => {
    assert.equal(statusLabel("unmapped"), "unmapped");
    assert.equal(roleLabel("unmapped"), "unmapped");
  });

  it("translates roles", () => {
    assert.equal(roleLabel("tenant_admin"), "Tenant Admin");
    assert.equal(roleLabel("super_admin"), "Platform Super Admin");
  });
});
