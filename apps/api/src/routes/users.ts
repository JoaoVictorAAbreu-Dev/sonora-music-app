import { eq } from 'drizzle-orm';
import type { User } from '@sonora/shared';
import type { Db } from '../db/client';
import { users } from '../db/schema';

type UserRow = typeof users.$inferSelect;

export function toUserDto(u: UserRow): User {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    createdAt: u.createdAt.toISOString(),
  };
}

export async function findUserById(db: Db, id: string): Promise<UserRow | undefined> {
  const [u] = await db.select().from(users).where(eq(users.id, id));
  return u;
}
