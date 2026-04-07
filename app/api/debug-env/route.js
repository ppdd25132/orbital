import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  // Only expose env debug info to authenticated users
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || 'NOT SET';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || 'NOT SET';
  const nextauthUrl = process.env.NEXTAUTH_URL || 'NOT SET';
  const nextauthSecret = process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET';

  const mask = (val) => {
    if (val === 'NOT SET') return val;
    if (val.length < 10) return val.substring(0, 3) + '***';
    return val.substring(0, 10) + '...' + val.substring(val.length - 10);
  };

  return Response.json({
    GOOGLE_CLIENT_ID: mask(clientId),
    GOOGLE_CLIENT_SECRET: mask(clientSecret),
    NEXTAUTH_URL: nextauthUrl,
    NEXTAUTH_SECRET: nextauthSecret,
    timestamp: new Date().toISOString(),
  });
}
