import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session?.access_token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const maxResults = parseInt(searchParams.get('maxResults') ?? '20', 10);

  try {
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
      { headers: { Authorization: `Bearer ${session.access_token}` } }
    );
    if (!listRes.ok) {
      return NextResponse.json({ error: 'Gmail API error' }, { status: listRes.status });
    }
    const listData = await listRes.json();
    const messageIds = listData.messages || [];

    const messages = await Promise.all(
      messageIds.slice(0, 15).map(async ({ id }) => {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );
        if (!msgRes.ok) return null;
        const msg = await msgRes.json();
        const headers = msg.payload?.headers || [];
        const get = (name) => headers.find((h) => h.name === name)?.value || '';
        return {
          id: msg.id,
          threadId: msg.threadId,
          subject: get('Subject'),
          from: get('From'),
          date: get('Date'),
          snippet: msg.snippet,
        };
      })
    );

    return NextResponse.json({ messages: messages.filter(Boolean) });
  } catch (err) {
    console.error('Gmail messages error:', err);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
