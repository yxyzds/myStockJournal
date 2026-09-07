import { eq } from "drizzle-orm";
import { createClerkClient } from "@clerk/backend";
import { env } from "../env";
import { db } from "../db";
import { users } from "../db/schema";
import { seedWatchlist } from "../db/seed-watchlist";

export type AppUser = typeof users.$inferSelect;

function clerkClient() {
  return createClerkClient({ secretKey: env.clerkSecretKey });
}

function displayName(firstName: string | null, lastName: string | null, username: string | null, email: string) {
  const full = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (username) return username;
  return email.split("@")[0] || "Investor";
}

export function usernameFromEmail(email: string) {
  return email.split("@")[0] || "user";
}

export async function ensureAppUser(clerkUserId: string): Promise<AppUser> {
  const existing = await db.select().from(users).where(eq(users.clerkId, clerkUserId)).limit(1);
  if (existing[0]) return existing[0];

  const clerkUser = await clerkClient().users.getUser(clerkUserId);
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    `${clerkUserId.replace(/[^a-zA-Z0-9]/g, "")}@users.clerk.local`;
  const name = displayName(clerkUser.firstName, clerkUser.lastName, clerkUser.username, email);

  const byEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (byEmail[0]) {
    const [updated] = await db
      .update(users)
      .set({ clerkId: clerkUserId, name })
      .where(eq(users.id, byEmail[0].id))
      .returning();
    return updated;
  }

  const [created] = await db.insert(users).values({ clerkId: clerkUserId, email, name }).returning();
  try {
    await seedWatchlist(created.id);
  } catch (error) {
    console.warn("Could not seed watchlist for new user", error);
  }
  return created;
}

export async function getAppUser(userId: string): Promise<AppUser | undefined> {
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return rows[0];
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? name.trim(),
    lastName: parts.slice(1).join(" "),
  };
}

export async function updateAppUser(
  userId: string,
  clerkUserId: string | null,
  input: { name: string; email: string },
): Promise<AppUser> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name) throw Object.assign(new Error("Name is required"), { status: 400 });
  if (!/^[^\s@]+@[^\s@]+$/.test(email)) {
    throw Object.assign(new Error("Enter a valid email"), { status: 400 });
  }

  const taken = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (taken[0] && taken[0].id !== userId) {
    throw Object.assign(new Error("That email is already in use"), { status: 409 });
  }

  if (clerkUserId && env.clerkSecretKey) {
    const client = clerkClient();
    const { firstName, lastName } = splitName(name);
    await client.users.updateUser(clerkUserId, { firstName, lastName });
    const clerkUser = await client.users.getUser(clerkUserId);
    const current =
      clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress ?? "";
    if (current.toLowerCase() !== email) {
      const match = clerkUser.emailAddresses.find((item) => item.emailAddress.toLowerCase() === email);
      if (match) {
        await client.users.updateUser(clerkUserId, { primaryEmailAddressID: match.id });
      } else {
        await client.emailAddresses.createEmailAddress({
          userId: clerkUserId,
          emailAddress: email,
          primary: true,
          verified: true,
        });
      }
    }
  }

  const [updated] = await db.update(users).set({ name, email }).where(eq(users.id, userId)).returning();
  return updated;
}
