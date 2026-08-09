import type { NextResponse } from "next/server";

export function setSessionCookie(response: NextResponse, token: string, persistent = false) {
  response.cookies.set("sf_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: persistent ? 60 * 60 * 24 * 7 : undefined,
    priority: "high",
  });
}
