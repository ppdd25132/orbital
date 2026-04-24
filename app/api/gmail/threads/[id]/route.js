import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getThread, modifyThread } from '@/lib/gmail';
import { resolveGmailAccessToken } from '@/lib/gmail-auth';

async function resolveAccessToken(request, session, accountEmail) {
  return resolveGmailAccessToken(request, session, accountEmail || session.user?.email);
}

export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return Response.json({ error: 'Thread ID is required' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const accountEmail = searchParams.get('account');

  try {
    const token = await resolveAccessToken(request, session, accountEmail);
    const thread = await getThread(token, id);
    return Response.json({ thread });
  } catch (err) {
    console.error('Gmail getThread error:', err);
    return Response.json({ error: 'Failed to fetch thread' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return Response.json({ error: 'Thread ID is required' }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    accountEmail,
    addLabelIds = [],
    removeLabelIds = [],
  } = body;

  try {
    const token = await resolveAccessToken(request, session, accountEmail);
    const result = await modifyThread(token, id, { addLabelIds, removeLabelIds });
    return Response.json({ ok: true, result });
  } catch (err) {
    console.error('Gmail modifyThread error:', err);
    const message = err?.message || 'Failed to update thread';
    return Response.json({ error: message }, { status: 500 });
  }
}
