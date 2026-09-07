import { verifyToken } from "@clerk/backend";
import type { MiddlewareHandler } from "hono";
import { env } from "./env";
import { ensureAppUser } from "./lib/users";
import type { AppEnv } from "./types";

export const resolveUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.req.path === "/health") {
    if (!env.clerkSecretKey && env.localUserId) {
      c.set("userId", env.localUserId);
      c.set("clerkUserId", null);
    }
    await next();
    return;
  }

  if (!env.clerkSecretKey) {
    if (!env.localUserId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    c.set("userId", env.localUserId);
    c.set("clerkUserId", null);
    await next();
    return;
  }

  const header = c.req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  try {
    const payload = await verifyToken(token, { secretKey: env.clerkSecretKey });
    const clerkUserId = payload.sub;
    if (!clerkUserId) return c.json({ error: "Unauthorized" }, 401);
    const user = await ensureAppUser(clerkUserId);
    c.set("userId", user.id);
    c.set("clerkUserId", clerkUserId);
    await next();
  } catch (error) {
    console.warn("Clerk token verify failed", error);
    return c.json({ error: "Unauthorized" }, 401);
  }
};
