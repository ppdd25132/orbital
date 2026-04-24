import { requireSession, parseLimitedJson, jsonError } from "@/lib/api-guard";
import { hasDatabaseConfig } from "@/lib/orbital-db";
import { createDraft, recordAiCall } from "@/lib/orbital-store";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-5";

const TONE_INSTRUCTIONS = {
  professional: "professional, polished, complete, warm, and client-ready",
  casual: "friendly and conversational, with contractions and light formality",
  brief: "short and direct, with no filler",
};

function buildSystemPrompt(userName, userEmail, tone) {
  const firstName = userName?.split(" ")[0] || "there";
  const toneDesc = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.professional;
  const closing = tone === "brief" ? "" : ` Close with "Best,\\n${firstName}".`;

  return `You are an AI email drafting assistant for ${userName || "the user"} <${userEmail || ""}>.

Create a reply to the last message in the thread.

Tone: ${toneDesc}.
Rules:
- Return JSON only, with keys "draft", "rationale", and "source_message_indexes".
- Do not include markdown fences.
- Address every question or request raised in the last message.
- Do not invent facts not present in the thread.
- Keep the draft editable and ready for human approval.${closing}`;
}

function buildThreadHistory(threadMessages = []) {
  return threadMessages
    .map((message, index) => {
      const from = message.from?.email
        ? `${message.from?.name || message.from.email} <${message.from.email}>`
        : message.from?.name || "Unknown sender";
      return `[Message ${index}] ${from} - ${message.time || "unknown time"}\n${message.body || ""}`;
    })
    .join("\n\n---\n\n");
}

function parseDraftResponse(text) {
  const trimmed = (text || "").replace(/```(?:json)?/g, "").replace(/```/g, "").trim();
  try {
    const parsed = JSON.parse(trimmed);
    return {
      draft: parsed.draft || trimmed,
      rationale: parsed.rationale || "Drafted from the latest thread context.",
      sourceMessageIndexes: Array.isArray(parsed.source_message_indexes)
        ? parsed.source_message_indexes
        : [],
    };
  } catch {
    return {
      draft: trimmed,
      rationale: "Drafted from the latest thread context.",
      sourceMessageIndexes: [],
    };
  }
}

function buildSourceRefs(threadMessages = [], threadId) {
  return threadMessages.map((message, index) => ({
    type: "gmail_message",
    index,
    message_id: message.id || null,
    thread_id: threadId || message.threadId || null,
    from: message.from?.email || null,
    time: message.time || null,
  }));
}

export async function POST(request) {
  try {
    const session = await requireSession();
    if (!hasDatabaseConfig()) {
      return Response.json(
        { error: "Durable Orbital storage is required for approval-gated AI drafts" },
        { status: 503 }
      );
    }

    const body = await parseLimitedJson(request);
    const {
      threadMessages,
      threadId,
      accountEmail,
      to,
      subject,
      replyToMessageId,
      tone = "professional",
      scope = {},
    } = body;

    if (!Array.isArray(threadMessages) || threadMessages.length === 0) {
      return Response.json({ error: "threadMessages array is required" }, { status: 400 });
    }

    if (!to || !subject) {
      return Response.json({ error: "to and subject are required" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const userName = session.user?.name || "";
    const userEmail = session.user?.email || "";
    const sourceRefs = buildSourceRefs(threadMessages, threadId);
    const systemPrompt = buildSystemPrompt(userName, userEmail, tone);
    const history = buildThreadHistory(threadMessages);
    const lastMessage = threadMessages[threadMessages.length - 1];

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1400,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content:
              `Here is the full email thread:\n\n${history}\n\n` +
              `You are replying to the last message from ${lastMessage.from?.name || "the sender"}.`,
          },
        ],
      }),
    });

    const data = await anthropicResponse.json();
    if (!anthropicResponse.ok) {
      return Response.json(
        { error: data.error?.message || "Draft generation failed" },
        { status: anthropicResponse.status }
      );
    }

    const text = data.content?.map((block) => block.text || "").join("") || "";
    const parsed = parseDraftResponse(text);
    const selectedSourceRefs = parsed.sourceMessageIndexes.length
      ? sourceRefs.filter((ref) => parsed.sourceMessageIndexes.includes(ref.index))
      : sourceRefs;

    const aiCallId = await recordAiCall({
      userEmail,
      provider: "anthropic",
      model: MODEL,
      purpose: "draft_response",
      requestSummary: {
        threadId,
        accountEmail,
        tone,
        messageCount: threadMessages.length,
      },
      responseSummary: {
        textLength: parsed.draft.length,
        rationale: parsed.rationale,
      },
      sourceRefs: selectedSourceRefs,
      scope,
    });

    const draft = await createDraft({
      userEmail,
      accountEmail,
      threadId,
      replyToMessageId,
      toEmail: to,
      subject,
      body: parsed.draft,
      originalBody: parsed.draft,
      rationale: parsed.rationale,
      aiCallId,
      sourceRefs: selectedSourceRefs,
      scope,
    });

    return Response.json({
      draftId: draft.id,
      draft: draft.body,
      rationale: draft.rationale,
      sourceRefs: draft.source_refs,
      aiCallId,
      approvalRequired: true,
    });
  } catch (error) {
    return jsonError(error, "Failed to create AI draft");
  }
}
