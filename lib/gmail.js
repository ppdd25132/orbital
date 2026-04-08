import { google } from 'googleapis';

function createGmailClient(accessToken) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth });
}

function decodeBase64Url(data) {
  if (!data) return '';
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

function decodeQuotedPrintable(str) {
  return str
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function decodePartBody(part) {
  const raw = decodeBase64Url(part.body.data);
  const enc = (part.headers || [])
    .find((h) => h.name?.toLowerCase() === 'content-transfer-encoding')
    ?.value?.toLowerCase() || '';
  return enc === 'quoted-printable' ? decodeQuotedPrintable(raw) : raw;
}

function collectParts(payload, htmlParts, textParts) {
  if (!payload) return;
  const mime = (payload.mimeType || '').toLowerCase();
  if (payload.body?.data) {
    if (mime === 'text/html') { htmlParts.push(payload); return; }
    if (mime === 'text/plain') { textParts.push(payload); return; }
  }
  if (payload.parts) {
    for (const part of payload.parts) collectParts(part, htmlParts, textParts);
  }
}

function extractHeader(headers, name) {
  const header = headers?.find(
    (h) => h.name.toLowerCase() === name.toLowerCase()
  );
  return header?.value ?? '';
}

function parseMessageBody(payload) {
  if (!payload) return '';
  // Single-part message: decode directly
  if (payload.body?.data && !payload.parts) {
    return decodePartBody(payload);
  }
  // Search the entire MIME tree and globally prefer text/html over text/plain
  const htmlParts = [];
  const textParts = [];
  collectParts(payload, htmlParts, textParts);
  if (htmlParts.length) return decodePartBody(htmlParts[0]);
  if (textParts.length) return decodePartBody(textParts[0]);
  return '';
}

export async function listMessages(accessToken, { maxResults = 20, query = '' } = {}) {
  const gmail = createGmailClient(accessToken);
  const res = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    q: query,
  });

  const messages = res.data.messages ?? [];

  const details = await Promise.all(
    messages.map((m) => getMessage(accessToken, m.id))
  );

  return details;
}

export async function getMessage(accessToken, messageId) {
  const gmail = createGmailClient(accessToken);
  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  const msg = res.data;
  const headers = msg.payload?.headers ?? [];

  return {
    id: msg.id,
    threadId: msg.threadId,
    labelIds: msg.labelIds ?? [],
    snippet: msg.snippet,
    internalDate: msg.internalDate,
    subject: extractHeader(headers, 'Subject'),
    from: extractHeader(headers, 'From'),
    to: extractHeader(headers, 'To'),
    date: extractHeader(headers, 'Date'),
    body: parseMessageBody(msg.payload),
  };
}

export async function sendMessage(accessToken, { to, subject, body, replyToMessageId } = {}) {
  const gmail = createGmailClient(accessToken);

  const headers = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
  ];

  let threadId;

  if (replyToMessageId) {
    // Fetch the original message to get RFC 2822 threading headers
    const original = await gmail.users.messages.get({
      userId: 'me',
      id: replyToMessageId,
      format: 'metadata',
      metadataHeaders: ['Message-ID', 'References'],
    });

    threadId = original.data.threadId;
    const origHeaders = original.data.payload?.headers ?? [];
    const origMessageId = extractHeader(origHeaders, 'Message-ID');
    const origReferences = extractHeader(origHeaders, 'References');

    if (origMessageId) {
      headers.push(`In-Reply-To: ${origMessageId}`);
      // Build References chain: existing References + the message we're replying to
      const refChain = origReferences
        ? `${origReferences} ${origMessageId}`
        : origMessageId;
      headers.push(`References: ${refChain}`);
    }
  }

  const raw = Buffer.from([...headers, '', body].join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const requestBody = { raw };
  if (threadId) requestBody.threadId = threadId;

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody,
  });
  return res.data;
}

export async function getThread(accessToken, threadId) {
  const gmail = createGmailClient(accessToken);
  const res = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'full',
  });

  const thread = res.data;
  const messages = (thread.messages ?? []).map((msg) => {
    const headers = msg.payload?.headers ?? [];
    return {
      id: msg.id,
      threadId: msg.threadId,
      labelIds: msg.labelIds ?? [],
      snippet: msg.snippet,
      internalDate: msg.internalDate,
      subject: extractHeader(headers, 'Subject'),
      from: extractHeader(headers, 'From'),
      to: extractHeader(headers, 'To'),
      date: extractHeader(headers, 'Date'),
      body: parseMessageBody(msg.payload),
    };
  });

  return { id: thread.id, historyId: thread.historyId, messages };
}
