// app/api/draft/route.js
// Proxies AI draft requests to Claude API, keeping the API key server-side

const TONE_INSTRUCTIONS = {
  professional: "professional and polished — use complete sentences, a warm greeting, and a formal closing",
  casual: "friendly and conversational — keep it natural, skip formality, use contractions freely",
  brief: "short and to the point — two to four sentences maximum, no filler, no pleasantries",
};

function buildSystemPrompt(userName, userEmail, tone) {
  const firstName = userName?.split(" ")[0] || "there";
  const toneDesc = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.professional;
  const closing = tone === "brief" ? "" : ` Close with "Best,\\n${firstName}".`;

  return `You are an AI email drafting assistant for ${userName || "the user"} <${userEmail || ""}>.

Your task: write a reply to the last message in the email thread below.

Tone: ${toneDesc}.
Rules:
- Respond ONLY with the email body — no subject line, no meta-commentary, no preamble like "Here is a draft".
- Address every question or request raised in the last message.
- Match the register of the conversation (if it's internal Slack-style, keep it loose; if it's client-facing, stay crisp).${closing}`;
}

function buildThreadHistory(threadMessages) {
  return threadMessages
    .map((m, i) => {
      const label = `[Message ${i + 1}] ${m.from.name} <${m.from.email}> — ${m.time}`;
      return `${label}\n${m.body}`;
    })
    .join("\n\n---\n\n");
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Support both the new structured format and the legacy system/messages format
  const { threadMessages, userName, userEmail, tone, system, messages } = body;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY not configured' },
      { status: 500 }
    );
  }

  let systemPrompt;
  let claudeMessages;

  if (threadMessages && Array.isArray(threadMessages) && threadMessages.length > 0) {
    // New structured format: build prompt server-side
    systemPrompt = buildSystemPrompt(userName, userEmail, tone || 'professional');
    const history = buildThreadHistory(threadMessages);
    const lastMsg = threadMessages[threadMessages.length - 1];
    claudeMessages = [
      {
        role: 'user',
        content: `Here is the full email thread:\n\n${history}\n\nYou are replying to the last message from ${lastMsg.from.name}. Write the reply now.`,
      },
    ];
  } else if (messages && Array.isArray(messages) && messages.length > 0) {
    // Legacy format passthrough
    systemPrompt = system;
    claudeMessages = messages;
  } else {
    return Response.json({ error: 'threadMessages or messages array is required' }, { status: 400 });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system: systemPrompt,
        messages: claudeMessages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic API error:', data);
      return Response.json(
        { error: data.error?.message || 'Draft generation failed' },
        { status: response.status }
      );
    }

    return Response.json(data);
  } catch (error) {
    console.error('Draft generation error:', error);
    return Response.json(
      { error: 'Failed to generate draft' },
      { status: 500 }
    );
  }
}
