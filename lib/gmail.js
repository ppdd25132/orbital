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

function extractHeader(headers, name) {
  const header = headers?.find(
    (h) => h.name.toLowerCase() === name.toLowerCase()
  );
  return header?.value ?? '';
}

function parseMessageBody(payload) {
  if (!payload) return '';

  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts) {
    // Prefer text/html, fall back to text/plain
    const htmlPart = payload.parts.find((p) => p.mimeType === 'text/html');
    if (htmlPart?.body?.data) return decodeBase64Url(htmlPart.body.data);

    const textPart = payload.parts.find((p) => p.mimeType === 'text/plain');
    if (textPart?.body?.data) return decodeBase64Url(textPart.body.data);

    // Recurse into nested multipart
    for (const part of payload.parts) {
      const body = parseMessageBody(part);
      if (body) return body;
    }
  }

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

  const messageParts = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ];

  if (replyToMessageId) {
    messageParts.splice(2, 0, `In-Reply-To: ${replyToMessageId}`);
  }

  const raw = Buffer.from(messageParts.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const params = { userId: 'me', requestBody: { raw } };
  if (replyToMessageId) {
    const original = await gmail.users.messages.get({
      userId: 'me',
      id: replyToMessageId,
      format: 'minimal',
    });
    params.requestBody.threadId = original.data.threadId;
  }

  const res = await gmail.users.messages.send(params);
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
