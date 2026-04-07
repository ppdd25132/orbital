import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getThread } from '@/lib/gmail';
import { getLinkedAccounts, refreshTokenIfNeeded } from '@/lib/linked-accounts';

export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session?.access_token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return Response.json({ error: 'Thread ID is required' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const accountEmail = searchParams.get('account');

  let token = session.access_token;

  if (accountEmail && accountEmail !== session.user?.email) {
    const linked = getLinkedAccounts(request);
    const acc = linked.find((a) => a.email === accountEmail);
    if (acc) {
      const refreshed = await refreshTokenIfNeeded(acc);
      token = refreshed.access_token;
    }
  }

  try {
    const thread = await getThread(token, id);
    return Response.json({ thread });
  } catch (err) {
    console.error('Gmail getThread error:', err);
    return Response.json({ error: 'Failed to fetch thread' }, { status: 500 });
  }
}
