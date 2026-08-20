import { getAuthenticatedContext } from "@/lib/api-security";
import { consumeRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Today's petrol rate, when a provider is configured.
 *
 * This route never fails the request. A rate lookup is a convenience on top of
 * a field the user can always type, and a fill has to stay recordable while
 * standing at a pump with no signal — so every failure path answers
 * `configured: false` and the client falls back to the last rate it saw. An
 * error status here would surface as a scary toast over a form that was about
 * to work perfectly well.
 */
export async function GET(request: Request) {
  const context = await getAuthenticatedContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = await consumeRateLimit({
    scope: "fuel-price",
    identifier: context.userId,
    limit: 60,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) return NextResponse.json({ configured: false });

  const apiKey = process.env.FUEL_PRICE_API_KEY;
  const city = new URL(request.url).searchParams.get("city")?.trim();
  if (!apiKey || !city) return NextResponse.json({ configured: false });

  try {
    const rate = await fetchProviderRate(city, apiKey);
    return NextResponse.json({
      configured: true,
      rate,
      city,
      date: new Date().toISOString().slice(0, 10),
    });
  } catch {
    return NextResponse.json({ configured: false });
  }
}

/**
 * The provider, expressed as configuration rather than code.
 *
 * No official free government API publishes daily city-wise Indian retail
 * prices, so this has to work against whichever third-party vendor the operator
 * signs up with. `FUEL_PRICE_API_URL` carries a `{city}` placeholder and the
 * response is searched for a petrol figure, because every vendor nests it
 * somewhere slightly different. Swapping vendors is then an env change.
 */
async function fetchProviderRate(city: string, apiKey: string): Promise<number> {
  const template = process.env.FUEL_PRICE_API_URL;
  if (!template) throw new Error("FUEL_PRICE_API_URL is not set");

  const response = await fetch(template.replace("{city}", encodeURIComponent(city)), {
    headers: { Authorization: `Bearer ${apiKey}`, "X-Api-Key": apiKey },
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) throw new Error(`provider responded ${response.status}`);

  const rate = findPetrolRate(await response.json());
  if (rate === null) throw new Error("no petrol rate in provider response");
  return rate;
}

function findPetrolRate(value: unknown, depth = 0): number | null {
  if (depth > 4 || value === null || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  for (const key of ["petrol", "Petrol", "petrol_price", "petrolPrice"]) {
    const candidate = Number(record[key]);
    if (Number.isFinite(candidate) && candidate > 0) return candidate;
  }
  for (const nested of Object.values(record)) {
    const found = findPetrolRate(nested, depth + 1);
    if (found !== null) return found;
  }
  return null;
}
