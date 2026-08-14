import type { NextResponse } from "next/server";

const DAY_SECONDS = 60 * 60 * 24;

/**
 * How long a signed-in session lives.
 *
 * These are also the JWT lifetimes — the cookie and the token must expire
 * together. A cookie that outlives its token logs the user out on the next
 * request with no way to tell why; a token that outlives its cookie is a
 * credential the browser has already thrown away.
 *
 * The values are deliberately long. Aartha is installed as a PWA on phones,
 * and a phone "closes the browser" every time the OS reclaims the app. The
 * previous default left `maxAge` unset, which makes a *session* cookie: it
 * died with that browser session, so mobile users were signed out roughly
 * daily even though their 12h token was still valid.
 */
export const SESSION_TTL_SECONDS = DAY_SECONDS * 30;
export const REMEMBERED_TTL_SECONDS = DAY_SECONDS * 90;
/** The admin console is a privileged surface, so it does not get the long TTL. */
export const ADMIN_TTL_SECONDS = DAY_SECONDS;

export function sessionTtlSeconds(remember: boolean) {
  return remember ? REMEMBERED_TTL_SECONDS : SESSION_TTL_SECONDS;
}

/** `expiresIn` for `signJwt`, kept in lockstep with the cookie's `maxAge`. */
export function sessionTokenExpiry(maxAgeSeconds: number) {
  return `${maxAgeSeconds}s` as const;
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  maxAgeSeconds: number = SESSION_TTL_SECONDS,
) {
  response.cookies.set("sf_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // `strict` withheld the cookie on any inbound navigation from another
    // site, so following a link into the app looked like being signed out.
    // Every mutating route already verifies the request origin, so `lax`
    // costs no CSRF protection.
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
    priority: "high",
  });
}
