import { env } from "../env";
import { db } from "./index";
import { users } from "./schema";

export async function seedLocalUser() {
  await db
    .insert(users)
    .values({
      id: env.localUserId,
      email: env.localUserEmail,
      name: env.localUserName,
    })
    .onConflictDoNothing({ target: users.id });
}
