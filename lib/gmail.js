import { google } from "googleapis";

function createGmailClient(accessToken) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth });
}

function normalizeBase64Url(data = "") {
  return data.replace(/-/g, "+").replace(/_/g, "/");
}

function decodeBase64Url(data) {
  if (!data) return "";
  return Buffer.from(normalizeBase64Url(data), "base64").toString("utf-8");
}

function extractHeader(headers, name) {
  const header = headers?.find(
    (item) => item.name.toLowerCase() === name.toLowerCase()
  );
  return header?.value ?? "";
}

function findBodyPart(payload, preferredTypes = ["text/html", "text/plain"]) {
  if (!payload) return null;

  if (preferredTypes.includes(payload.mimeType) && payload.body?.data) {
    return payload;
  }

  for (const part of payload.parts || []) {
    const directMatch = findBodyPart(part, preferredTypes);
    if (directMatch) return directMatch;
  }

  if (payload.body?.data) {
    return payload;
  }

  return null;
}

function parseMessageBody(payload) {
  // Search entire MIME tree for HTML first, then fall back to plain text.
  // A single DFS with both types would return whichever appears first in the
  // tree (often text/plain inside multipart/alternative), so we do two passes.
  const htmlPart = findBodyPart(payload, ["text/html"]);
  if (htmlPart?.body?.data) return decodeBase64Url(htmlPart.body.data);
  const textPart = findBodyPart(payload, ["text/plain"]);
  return textPart?.body?.data ? decodeBase64Url(textPart.body.data) : "";
}

function collectInlineDescriptors(payload, descriptors = []) {
  if (!payload?.parts?.length) return descriptors;

  for (const part of payload.parts) {
    const headers = part.headers || [];
    const contentId = extractHeader(headers, "Content-ID").replace(/[<>]/g, "").trim();
    const disposition = extractHeader(headers, "Content-Disposition");
    const attachmentId = part.body?.attachmentId;
    const isInline = Boolean(contentId) || /inline/i.test(disposition || "");

    if (attachmentId && isInline) {
      descriptors.push({
        attachmentId,
        contentId,
        filename: part.filename,
        mimeType: part.mimeType || "application/octet-stream",
      });
    }

    collectInlineDescriptors(part, descriptors);
  }

  return descriptors;
}

async function fetchInlineAttachments(gmail, messageId, payload) {
  const descriptors = collectInlineDescriptors(payload, []);
  if (!descriptors.length) return {};

  const entries = await Promise.all(
    descriptors.map(async (descriptor) => {
      try {
        const response = await gmail.users.messages.attachments.get({
          userId: "me",
          messageId,
          id: descriptor.attachmentId,
        });

        const data = response.data.data;
        if (!data) return [];

        // Normalize to standard padded base64 for reliable data: URL rendering
        let b64 = normalizeBase64Url(data);
        const pad = b64.length % 4;
        if (pad) b64 += "=".repeat(4 - pad);

        const dataUri = `data:${descriptor.mimeType};base64,${b64}`;

        // Store all lookup variants so resolveInlineAttachments can find the
        // image regardless of case or whether the cid: prefix is present.
        const rawKeys = [descriptor.contentId, descriptor.filename, descriptor.attachmentId]
          .filter(Boolean);
        const allKeys = new Set([
          ...rawKeys,
          ...rawKeys.map((k) => k.toLowerCase()),
          ...rawKeys.map((k) => `cid:${k}`),
          ...rawKeys.map((k) => `cid:${k.toLowerCase()}`),
        ]);

        return Array.from(allKeys).map((key) => [key, dataUri]);
      } catch {
        return [];
      }
    })
  );

  return Object.fromEntries(entries.flat());
}

export async function listMessages(
  accessToken,
  { maxResults = 20, query = "" } = {}
) {
  const gmail = createGmailClient(accessToken);
  const response = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    q: query,
  });

  const messages = response.data.messages ?? [];
  const details = await Promise.all(messages.map((message) => getMessage(accessToken, message.id)));
  return details;
}

export async function getMessage(accessToken, messageId) {
  const gmail = createGmailClient(accessToken);
  const response = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  const message = response.data;
  const headers = message.payload?.headers ?? [];
  const body = parseMessageBody(message.payload);

  return {
    id: message.id,
    threadId: message.threadId,
    labelIds: message.labelIds ?? [],
    snippet: message.snippet,
    internalDate: message.internalDate,
    subject: extractHeader(headers, "Subject"),
    from: extractHeader(headers, "From"),
    to: extractHeader(headers, "To"),
    date: extractHeader(headers, "Date"),
    body,
    inlineAttachments: body.includes("cid:")
      ? await fetchInlineAttachments(gmail, message.id, message.payload)
      : {},
  };
}

export async function sendMessage(
  accessToken,
  { to, subject, body, replyToMessageId } = {}
) {
  const gmail = createGmailClient(accessToken);

  const headers = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
  ];

  let threadId;

  if (replyToMessageId) {
    const original = await gmail.users.messages.get({
      userId: "me",
      id: replyToMessageId,
      format: "metadata",
      metadataHeaders: ["Message-ID", "References"],
    });

    threadId = original.data.threadId;
    const originalHeaders = original.data.payload?.headers ?? [];
    const originalMessageId = extractHeader(originalHeaders, "Message-ID");
    const originalReferences = extractHeader(originalHeaders, "References");

    if (originalMessageId) {
      headers.push(`In-Reply-To: ${originalMessageId}`);
      headers.push(
        `References: ${
          originalReferences ? `${originalReferences} ${originalMessageId}` : originalMessageId
        }`
      );
    }
  }

  const raw = Buffer.from([...headers, "", body].join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const requestBody = threadId ? { raw, threadId } : { raw };
  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody,
  });

  return response.data;
}

export async function getThread(accessToken, threadId) {
  const gmail = createGmailClient(accessToken);
  const response = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "full",
  });

  const thread = response.data;
  const messages = await Promise.all(
    (thread.messages ?? []).map(async (message) => {
      const headers = message.payload?.headers ?? [];
      const body = parseMessageBody(message.payload);

      return {
        id: message.id,
        threadId: message.threadId,
        labelIds: message.labelIds ?? [],
        snippet: message.snippet,
        internalDate: message.internalDate,
        subject: extractHeader(headers, "Subject"),
        from: extractHeader(headers, "From"),
        to: extractHeader(headers, "To"),
        date: extractHeader(headers, "Date"),
        body,
        inlineAttachments: body.includes("cid:")
          ? await fetchInlineAttachments(gmail, message.id, message.payload)
          : {},
      };
    })
  );

  return { id: thread.id, historyId: thread.historyId, messages };
}

export async function modifyThread(
  accessToken,
  threadId,
  { addLabelIds = [], removeLabelIds = [] } = {}
) {
  const gmail = createGmailClient(accessToken);
  const response = await gmail.users.threads.modify({
    userId: "me",
    id: threadId,
    requestBody: {
      addLabelIds,
      removeLabelIds,
    },
  });

  return response.data;
}
