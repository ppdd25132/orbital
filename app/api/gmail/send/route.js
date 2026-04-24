import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { sendMessage } from '@/lib/gmail';
import { resolveGmailAccessToken } from '@/lib/gmail-auth';

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
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

  try {
    const token = await resolveGmailAccessToken(request, session, fromEmail || session.user.email);
    const result = await sendMessage(token, {
      to,
      subject,
      body: messageBody,
      replyToMessageId,
    });
    return Response.json({ message: result });
  } catch (err) {
    console.error('Gmail sendMessage error:', err);
    const message = err?.message || 'Failed to send message';
    const status = typeof err?.status === 'number' ? err.status
      : typeof err?.code === 'number' ? err.code : 500;
    return Response.json({ error: message }, { status });
  }
}
