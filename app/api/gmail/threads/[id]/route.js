import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getThread } from '@/lib/gmail';

export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session?.access_token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  if (!id) {
    return Response.json({ error: 'Thread ID is required' }, { status: 400 });
  }

  try {
    const thread = await getThread(session.access_token, id);
    return Response.json({ thread });
  } catch (err) {
    console.error('Gmail getThread error:', err);
    return Response.json({ error: 'Failed to fetch thread' }, { status: 500 });
  }
}
