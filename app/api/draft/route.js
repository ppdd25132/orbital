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

function buildSuggestionsPrompt(userName, userEmail) {
  const firstName = userName?.split(" ")[0] || "there";
  return `You are an AI email assistant for ${userName || "the user"} <${userEmail || ""}>.

Generate exactly 3 short reply options for the last message in this email thread.

Rules:
- Each reply MUST be 1–2 sentences. Keep them punchy and executive-level.
- Vary the intent: (1) positive/agreeing/moving forward, (2) needs more info or deferring, (3) brief acknowledgment or polite decline.
- Match the formality of the conversation.
- Do NOT include greetings ("Hi X") or signatures ("Best, Y").
- Return ONLY a JSON array of exactly 3 strings. No markdown fences, no explanation.

Example: ["Sounds good, let's proceed with that approach.","Could we schedule a quick call to discuss the details?","Thanks for the update — I'll review and circle back by EOD."]`;
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
  const { threadMessages, userName, userEmail, tone, mode, system, messages } = body;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY not configured' },
      { status: 500 }
    );
  }

  let systemPrompt;
  let claudeMessages;
  const isSuggestions = mode === 'suggestions';

  if (threadMessages && Array.isArray(threadMessages) && threadMessages.length > 0) {
    systemPrompt = isSuggestions
      ? buildSuggestionsPrompt(userName, userEmail)
      : buildSystemPrompt(userName, userEmail, tone || 'professional');
    const history = buildThreadHistory(threadMessages);
    const lastMsg = threadMessages[threadMessages.length - 1];
    claudeMessages = [
      {
        role: 'user',
        content: `Here is the full email thread:\n\n${history}\n\nYou are replying to the last message from ${lastMsg.from.name}.${isSuggestions ? ' Generate 3 short reply options as a JSON array.' : ' Write the reply now.'}`,
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
        model: isSuggestions ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-5',
        max_tokens: isSuggestions ? 300 : 1024,
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

    // For suggestions mode, parse the JSON array from the response text
    if (isSuggestions) {
      try {
        const raw = data.content?.map((b) => b.text || '').join('') || '[]';
        const cleaned = raw.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
        const suggestions = JSON.parse(cleaned);
        return Response.json({ suggestions: Array.isArray(suggestions) ? suggestions.slice(0, 3) : [] });
      } catch {
        return Response.json({ suggestions: [] });
      }
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
