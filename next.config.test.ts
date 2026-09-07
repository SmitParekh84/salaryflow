import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

type HeaderRule = { source: string; headers: { key: string; value: string }[] };

async function rules(): Promise<HeaderRule[]> {
  const headers = await nextConfig.headers?.();
  return (headers ?? []) as HeaderRule[];
}

function cacheControlFor(all: HeaderRule[], source: string): string | undefined {
  // Next applies every matching rule in order and the last one to set a key
  // wins, so the effective value is the last match, not the first.
  return all
    .filter((rule) => rule.source === source)
    .flatMap((rule) => rule.headers)
    .filter((header) => header.key === "Cache-Control")
    .at(-1)?.value;
}

describe("API cache headers", () => {
  it("keeps every API response out of shared and browser stores by default", async () => {
    expect(cacheControlFor(await rules(), "/api/:path*")).toBe("private, no-store, max-age=0");
  });

  it("lets the notifications poll revalidate, so its ETag can answer 304", async () => {
    const all = await rules();
    const notifications = all.filter((rule) => rule.source === "/api/notifications");

    expect(notifications).toHaveLength(1);
    expect(cacheControlFor(all, "/api/notifications")).toBe("private, no-cache");
  });

  it("declares the notifications carve-out after the blanket rule that would override it", async () => {
    const all = await rules();
    const blanket = all.findIndex((rule) => rule.source === "/api/:path*");
    const carveOut = all.findIndex((rule) => rule.source === "/api/notifications");

    expect(blanket).toBeGreaterThanOrEqual(0);
    expect(carveOut).toBeGreaterThan(blanket);
  });
});
