import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { peerLastReadAt } from "../support-chat";

/** Mirrors the client-side rule used to render the "อ่านแล้ว" marker. */
function isSeen(messageCreatedAt: string, peerReadAt: string | null) {
  if (!peerReadAt) return false;
  return new Date(peerReadAt).getTime() >= new Date(messageCreatedAt).getTime();
}

const TENANT_READ = new Date("2026-07-25T10:00:00.000Z");
const ADMIN_READ = new Date("2026-07-25T11:00:00.000Z");

describe("peerLastReadAt", () => {
  it("shows the tenant when the admin last read", () => {
    const value = peerLastReadAt(
      { tenantLastReadAt: TENANT_READ, adminLastReadAt: ADMIN_READ },
      "tenant",
    );
    assert.equal(value, ADMIN_READ.toISOString());
  });

  it("shows the admin when the tenant last read", () => {
    const value = peerLastReadAt(
      { tenantLastReadAt: TENANT_READ, adminLastReadAt: ADMIN_READ },
      "platform",
    );
    assert.equal(value, TENANT_READ.toISOString());
  });

  it("returns null when the other side has never opened the thread", () => {
    assert.equal(
      peerLastReadAt({ tenantLastReadAt: null, adminLastReadAt: null }, "tenant"),
      null,
    );
  });
});

describe("seen calculation", () => {
  it("marks a message seen when it predates the peer's read time", () => {
    assert.equal(isSeen("2026-07-25T10:59:00.000Z", ADMIN_READ.toISOString()), true);
  });

  it("treats a message sent at the exact read moment as seen", () => {
    assert.equal(isSeen(ADMIN_READ.toISOString(), ADMIN_READ.toISOString()), true);
  });

  it("does NOT mark a message sent after the peer's last read", () => {
    assert.equal(isSeen("2026-07-25T11:30:00.000Z", ADMIN_READ.toISOString()), false);
  });

  it("is never seen when the peer has not read at all", () => {
    assert.equal(isSeen("2026-07-25T09:00:00.000Z", null), false);
  });
});
