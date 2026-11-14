import { describe, it, expect } from "bun:test";
import { isStaleEndEvent } from "../supabase/functions/_shared/subscription-events";

describe("late end/revoke events", () => {
  it("ignores an end event for an older subscription when a newer one is current", () => {
    expect(isStaleEndEvent("sub_new", "sub_old")).toBe(true);
  });
  it("applies an end event for the current subscription", () => {
    expect(isStaleEndEvent("sub_new", "sub_new")).toBe(false);
  });
  it("applies when no subscription id is stored yet", () => {
    expect(isStaleEndEvent(null, "sub_old")).toBe(false);
  });
});
