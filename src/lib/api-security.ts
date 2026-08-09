import { getCurrentUser } from "@/lib/server-auth";

export type AuthenticatedContext = {
  userId: string;
  userObjectId: string;
};

export async function getAuthenticatedContext(): Promise<AuthenticatedContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  return {
    userId: user.email || String(user._id),
    userObjectId: String(user._id),
  };
}

export function isJsonRequest(request: Request) {
  return request.headers.get("content-type")?.toLowerCase().includes("application/json") ?? false;
}

export function isSameOriginRequest(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
