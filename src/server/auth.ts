import bcrypt from "bcryptjs";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { createHmac, randomInt } from "node:crypto";

const SECRET = process.env.AUTH_SECRET;

if (!SECRET || SECRET.length < 32) {
  throw new Error("AUTH_SECRET must be configured with at least 32 characters");
}

const AUTH_SECRET: string = SECRET;

export function signJwt(payload: object, expiresIn: SignOptions["expiresIn"] = "7d") {
  return jwt.sign(payload, AUTH_SECRET, { expiresIn });
}

export function verifyJwt(token: string): JwtPayload | string | null {
  try {
    return jwt.verify(token, AUTH_SECRET);
  } catch {
    return null;
  }
}

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function generateOtp() {
  return String(randomInt(100000, 1000000));
}

export function hashOtp(email: string, code: string) {
  return createHmac("sha256", AUTH_SECRET).update(`${email.toLowerCase()}:${code}`).digest("hex");
}
