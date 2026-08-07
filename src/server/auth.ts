import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const SECRET = process.env.AUTH_SECRET || "dev-secret-change-me";

export function signJwt(payload: object, expiresIn = "30d") {
  // cast SECRET to jwt.Secret to satisfy typings
  return (jwt as any).sign(payload, SECRET as any, { expiresIn });
}

export function verifyJwt(token: string) {
  try {
    return (jwt as any).verify(token, SECRET as any);
  } catch (e) {
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
