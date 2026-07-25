import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { can, PERMISSIONS, type Permission } from "../permissions";

describe("permissions", () => {
  it("gives tenant_admin every permission", () => {
    for (const permission of Object.keys(PERMISSIONS) as Permission[]) {
      assert.equal(can("tenant_admin", permission), true, `tenant_admin should have ${permission}`);
    }
  });

  it("does not let a packer delete or share video", () => {
    assert.equal(can("packer", "video.delete"), false);
    assert.equal(can("packer", "video.share"), false);
  });

  it("lets a packer start a recording", () => {
    assert.equal(can("packer", "recording.start"), true);
  });

  it("keeps viewer read-only", () => {
    assert.equal(can("viewer", "video.view"), true);
    assert.equal(can("viewer", "stations.manage"), false);
    assert.equal(can("viewer", "employees.manage"), false);
  });

  it("rejects unknown roles", () => {
    assert.equal(can("intern", "video.view"), false);
    assert.equal(can("", "video.view"), false);
  });

  it("scopes claim officers to claims work", () => {
    assert.equal(can("claim_officer", "claims.manage"), true);
    assert.equal(can("claim_officer", "employees.manage"), false);
  });
});
