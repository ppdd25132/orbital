import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { sendMessage } from '@/lib/gmail';
import { getLinkedAccounts, refreshTokenIfNeeded } from '@/lib/linked-accounts';

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session?.access_token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { to, subject, body: messageBody, replyToMessageId, fromEmail } = body;

  if (!to || !subject || !messageBody) {
    return Response.json(
      { error: 'Missing required fields: to, subject, body' },
      { status: 400 }
    );
  }

  let token = session.access_token;

  if (fromEmail && fromEmail !== session.user?.email) {
    const linked = getLinkedAccounts(request);
    const acc = linked.find((a) => a.email === fromEmail);
    if (acc) {
      const refreshed = await refreshTokenIfNeeded(acc);
      token = refreshed.access_token;
    }
  }

  try {
    const result = await sendMessage(token, {
      to,
      subject,
      body: messageBody,
      replyToMessageId,
    });
    return Response.json({ message: result });
  } catch (err) {
    console.error('Gmail sendMessage error:', err);
    return Response.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
