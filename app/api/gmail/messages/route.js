import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import { getLinkedAccounts, refreshTokenIfNeeded } from '@/lib/linked-accounts';

async function fetchMessagesForAccount(token, accountEmail, maxResults) {
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!listRes.ok) return [];

  const listData = await listRes.json();
  const messageIds = listData.messages || [];

  const messages = await Promise.all(
    messageIds.slice(0, 15).map(async ({ id }) => {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${token}` } }
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
        accountEmail,
      };
    })
  );

  return messages.filter(Boolean);
}

export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session?.access_token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const maxResults = parseInt(searchParams.get('maxResults') ?? '20', 10);

  try {
    // Primary account
    const primaryEmail = session.user?.email || 'primary';
    const primaryMessages = await fetchMessagesForAccount(
      session.access_token,
      primaryEmail,
      maxResults
    );

    // Linked accounts — refresh tokens if needed, fetch in parallel
    const rawLinked = getLinkedAccounts(request);
    const linkedMessages = await Promise.all(
      rawLinked.map(async (acc) => {
        const refreshed = await refreshTokenIfNeeded(acc);
        return fetchMessagesForAccount(
          refreshed.access_token,
          refreshed.email,
          Math.ceil(maxResults / 2)
        );
      })
    );

    // Merge and sort by date descending
    const all = [...primaryMessages, ...linkedMessages.flat()].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    return NextResponse.json({ messages: all });
  } catch (err) {
    console.error('Gmail messages error:', err);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
