import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.access_token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { threads } = body;
  if (!threads?.length) {
    return NextResponse.json({ classifications: [] });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });
  }

  const threadList = threads
    .map(
      (t, i) =>
        `${i + 1}. ID: ${t.id}\n   From: ${t.sender}\n   Subject: ${t.subject}\n   Preview: ${t.snippet}`
    )
    .join('\n\n');

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: `You are an email classifier. For each email thread, classify it into exactly one category:
- needs-reply: The user needs to write a response (they are directly asked a question or a reply is expected)
- fyi-only: Informational only, no action needed (newsletters, status updates, notifications where no reply is needed)
- waiting-on-others: The user is waiting for someone else to respond or act
- actionable: Has a task or deadline for the user but does not require a direct reply (meeting invites, to-dos, reminders)
- promotional: Marketing, promotional, or sales emails

Respond with a JSON array only — no other text, no markdown, no explanation.
Format: [{"id": "thread_id", "category": "category_name"}, ...]`,
        messages: [
          {
            role: 'user',
            content: `Classify these email threads:\n\n${threadList}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('Anthropic API error:', res.status, errText);
      throw new Error(`Anthropic API error: ${res.status}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '[]';

    // Strip any accidental markdown code fences
    const jsonStr = text.replace(/```(?:json)?\n?/g, '').replace(/```\n?/g, '').trim();
    const classifications = JSON.parse(jsonStr);

    return NextResponse.json({ classifications });
  } catch (err) {
    console.error('Classification error:', err);
    return NextResponse.json({ error: 'Classification failed' }, { status: 500 });
  }
}
