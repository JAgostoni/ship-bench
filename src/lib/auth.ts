import { getServerSession } from 'next-auth';
import { authOptions } from '../app/api/auth/[...nextauth]/route';

export async function requireAuth() {
  const session = await getServerSession(authOptions as any);
  if (!session) {
    throw new Error('Unauthenticated');
  }
  return session;
}
