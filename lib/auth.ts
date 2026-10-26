import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { cache } from "react";
import { env } from "./env";
import { UnauthorizedError } from "./errors";
import { prisma } from "./prisma";
import type { User } from "@prisma/client";

// Credential auth: bcrypt password hashing + signed JWT session
// cookie (httpOnly, secure, SameSite=Lax). Server-side checks on
// every protected route — never trust the client.

const COOKIE = "wc_session";
const TTL_SEC = 60 * 60 * 24 * 7; // 7 days

const secret = new TextEncoder().encode(env.AUTH_SECRET);

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SEC}s`)
    .sign(secret);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SEC,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

async function readSession(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

/** Current user or null. Deduplicated per request via React cache. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const id = await readSession();
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
});

/** Current user or throw 401. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
