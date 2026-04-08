import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import { getLinkedAccounts, refreshTokenIfNeeded } from '@/lib/linked-accounts';

async function convertToGmailQuery(naturalQuery) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system:
        'Convert the user\'s natural language email search query into Gmail search syntax. ' +
        'Return ONLY the Gmail search filter string, nothing else. No explanation. No quotes. ' +
        'Examples:\n' +
        '"emails from Phil about invoices last week" → from:phil subject:invoice newer_than:7d\n' +
        '"unread messages from my boss" → from:boss is:unread\n' +
        '"attachments sent this month" → has:attachment newer_than:30d\n' +
        '"receipts from Amazon" → from:amazon subject:receipt OR subject:order',
      messages: [{ role: 'user', content: naturalQuery }],
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'NL conversion failed');
  return (data.content?.[0]?.text || naturalQuery).trim();
}

async function searchMessagesForAccount(token, accountEmail, query, maxResults) {
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!listRes.ok) return [];

  const listData = await listRes.json();
  const messageIds = listData.messages || [];
  if (messageIds.length === 0) return [];

  const messages = await Promise.all(
    messageIds.slice(0, 15).map(async ({ id, threadId }) => {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata` +
          `&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!msgRes.ok) return null;
      const msg = await msgRes.json();
      const headers = msg.payload?.headers || [];
      const get = (name) => headers.find((h) => h.name === name)?.value || '';
      return {
        id: msg.id,
        // Prefix threadId to avoid cross-account collisions when merging
        threadId: `${accountEmail}::${msg.threadId || threadId || id}`,
        _realThreadId: msg.threadId || threadId || id,
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
  const rawQuery = (searchParams.get('q') || '').trim();
  const naturalLanguage = searchParams.get('naturalLanguage') === 'true';
  const maxResults = Math.min(parseInt(searchParams.get('maxResults') ?? '20', 10), 50);

  if (!rawQuery) {
    return NextResponse.json({ messages: [], query: '', originalQuery: '' });
  }

  try {
    let gmailQuery = rawQuery;
    if (naturalLanguage) {
      try {
        gmailQuery = await convertToGmailQuery(rawQuery);
      } catch (e) {
        console.error('NL conversion error:', e);
        // Fall back to raw query
        gmailQuery = rawQuery;
      }
    }

    const primaryEmail = session.user?.email || 'primary';

    // Fetch primary + linked accounts in parallel
    const rawLinked = getLinkedAccounts(request);
    const [primaryMessages, ...linkedResults] = await Promise.all([
      searchMessagesForAccount(session.access_token, primaryEmail, gmailQuery, maxResults),
      ...rawLinked.map(async (acc) => {
        const refreshed = await refreshTokenIfNeeded(acc);
        return searchMessagesForAccount(
          refreshed.access_token,
          refreshed.email,
          gmailQuery,
          Math.ceil(maxResults / 2)
        );
      }),
    ]);

    // Merge and sort by date descending
    const all = [...primaryMessages, ...linkedResults.flat()].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    return NextResponse.json({
      messages: all,
      query: gmailQuery,
      originalQuery: rawQuery,
    });
  } catch (err) {
    console.error('Gmail search error:', err);
    return NextResponse.json({ error: 'Search failed. Please try again.' }, { status: 500 });
  }
}
