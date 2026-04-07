import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { sendMessage } from '@/lib/gmail';

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

  const { to, subject, body: messageBody, replyToMessageId } = body;

  if (!to || !subject || !messageBody) {
    return Response.json(
      { error: 'Missing required fields: to, subject, body' },
      { status: 400 }
    );
  }

  try {
    const result = await sendMessage(session.access_token, {
      to,
      subject,
      body: messageBody,
      replyToMessageId,
    });
    return Response.json({ message: result });
  } catch (err) {
    console.error('Gmail sendMessage error:', err);
    const message = err?.message || 'Failed to send message';
    const status = err?.status || err?.code || 500;
    return Response.json({ error: message }, { status: typeof status === 'number' ? status : 500 });
  }
}
