import { describe, expect, it } from "vitest";
import { syncIndicator } from "./sync-status";

const NOW = new Date(2026, 8, 7, 12, 0, 0);
const minutesAgo = (n: number) => new Date(NOW.getTime() - n * 60_000).toISOString();

describe("syncIndicator", () => {
  it("says nothing while everything is saved", () => {
    expect(
      syncIndicator({ status: "idle", error: null, unsavedSince: null, now: NOW }),
    ).toBeNull();
  });

  it("stays quiet during a save in flight, so a normal write does not flash a warning", () => {
    expect(
      syncIndicator({ status: "syncing", error: null, unsavedSince: minutesAgo(0), now: NOW }),
    ).toBeNull();
  });

  it("warns without alarming when the device is merely offline", () => {
    const result = syncIndicator({
      status: "offline",
      error: "Not connected.",
      unsavedSince: minutesAgo(2),
      now: NOW,
    });

    expect(result?.tone).toBe("warning");
    expect(result?.title).toBe("Not saved yet");
  });

  it("escalates a refusal by the server, which waiting will not fix", () => {
    const result = syncIndicator({
      status: "error",
      error: "This account's data is now too large to save in one go.",
      unsavedSince: minutesAgo(2),
      now: NOW,
    });

    expect(result?.tone).toBe("danger");
    expect(result?.detail).toContain("too large");
  });

  it("ages the warning, because an hour of unsaved entries is a different problem", () => {
    const fresh = syncIndicator({
      status: "offline",
      error: "Not connected.",
      unsavedSince: minutesAgo(1),
      now: NOW,
    });
    const stale = syncIndicator({
      status: "offline",
      error: "Not connected.",
      unsavedSince: minutesAgo(75),
      now: NOW,
    });

    expect(fresh?.age).toBeNull();
    expect(stale?.age).toBe("1h 15m");
  });

  it("escalates a long offline stretch to danger even though the network is the cause", () => {
    const result = syncIndicator({
      status: "offline",
      error: "Not connected.",
      unsavedSince: minutesAgo(75),
      now: NOW,
    });

    expect(result?.tone).toBe("danger");
  });
});
