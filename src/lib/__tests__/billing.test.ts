import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { startOfMonth } from "date-fns";
import {
  INVOICE_STATUSES,
  invoiceStatusLabel,
  invoiceStatusTone,
  periodDescription,
} from "../billing";
import { dataRequestStatusLabel, dataRequestTypeLabel, DATA_REQUEST_TYPES } from "../data-requests";

describe("periodDescription", () => {
  it("is stable for the same month and plan — the idempotency key for billing", () => {
    const first = periodDescription(startOfMonth(new Date("2026-07-14T10:00:00Z")), "Business");
    const second = periodDescription(startOfMonth(new Date("2026-07-28T22:30:00Z")), "Business");
    assert.equal(first, second);
  });

  it("differs across months", () => {
    const july = periodDescription(new Date("2026-07-01T00:00:00Z"), "Business");
    const august = periodDescription(new Date("2026-08-01T00:00:00Z"), "Business");
    assert.notEqual(july, august);
  });

  it("differs across plans", () => {
    const period = new Date("2026-07-01T00:00:00Z");
    assert.notEqual(periodDescription(period, "Starter"), periodDescription(period, "Business"));
  });
});

describe("invoice status helpers", () => {
  it("labels every supported status", () => {
    for (const status of INVOICE_STATUSES) {
      assert.notEqual(invoiceStatusLabel(status), status, `${status} should be translated`);
    }
  });

  it("maps paid to success and open to warning", () => {
    assert.equal(invoiceStatusTone("paid"), "success");
    assert.equal(invoiceStatusTone("open"), "warning");
    assert.equal(invoiceStatusTone("void"), "neutral");
  });
});

describe("data request helpers", () => {
  it("labels both request types", () => {
    for (const type of DATA_REQUEST_TYPES) {
      assert.notEqual(dataRequestTypeLabel(type), type);
    }
  });

  it("labels each lifecycle status", () => {
    assert.equal(dataRequestStatusLabel("pending"), "รอดำเนินการ");
    assert.equal(dataRequestStatusLabel("completed"), "เสร็จสิ้น");
    assert.equal(dataRequestStatusLabel("weird"), "weird");
  });
});
