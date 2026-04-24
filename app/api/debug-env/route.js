import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request) {
  if (process.env.ORBITAL_ENABLE_DEBUG_ENV !== 'true') {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  // Only expose env debug info to authenticated users. In production, optionally
  // restrict it to a single admin email via ORBITAL_ADMIN_EMAIL.
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminEmail = process.env.ORBITAL_ADMIN_EMAIL;
  if (process.env.NODE_ENV === 'production' && adminEmail && session.user?.email !== adminEmail) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  return Response.json({
    GOOGLE_CLIENT_ID_SET: Boolean(process.env.GOOGLE_CLIENT_ID),
    GOOGLE_CLIENT_SECRET_SET: Boolean(process.env.GOOGLE_CLIENT_SECRET),
    NEXTAUTH_URL_SET: Boolean(process.env.NEXTAUTH_URL),
    NEXTAUTH_SECRET_SET: Boolean(process.env.NEXTAUTH_SECRET),
    ORBITAL_DATABASE_CONFIGURED: Boolean(
      process.env.ORBITAL_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL
    ),
    timestamp: new Date().toISOString(),
  });
}
