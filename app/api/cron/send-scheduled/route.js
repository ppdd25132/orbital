import { sendMessage } from "@/lib/gmail";
import {
  getConnectedAccountToken,
  listDueScheduledSends,
  updateScheduledSendStatus,
  updateDraftBodyAndStatus,
  auditLog,
} from "@/lib/orbital-store";
import { refreshTokenIfNeeded } from "@/lib/linked-accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cronAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV !== "production") return true;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request) {
  if (!cronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await listDueScheduledSends(10);
  const results = [];

  for (const item of due) {
    try {
      const tokenRecord = await getConnectedAccountToken(item.user_email, item.account_email || item.user_email);
      if (!tokenRecord?.access_token) {
        throw new Error("No server-side Gmail token available");
      }

      const refreshed = await refreshTokenIfNeeded({
        email: item.account_email || item.user_email,
        ...tokenRecord,
      });

      const message = await sendMessage(refreshed.access_token, {
        to: item.to_email,
        subject: item.subject,
        body: item.body,
        replyToMessageId: item.reply_to_message_id,
      });

      await updateScheduledSendStatus(item.user_email, item.id, "sent", {
        sentMessageId: message.id,
      });
      await updateDraftBodyAndStatus(item.user_email, item.draft_id, { status: "sent" });
      await auditLog({
        userEmail: item.user_email,
        action: "scheduled_email_sent",
        targetType: "scheduled_send",
        targetId: item.id,
        metadata: { gmailMessageId: message.id || null },
      }).catch(() => {});
      results.push({ id: item.id, status: "sent" });
    } catch (error) {
      await updateScheduledSendStatus(item.user_email, item.id, "failed", {
        lastError: error.message,
      });
      results.push({ id: item.id, status: "failed", error: error.message });
    }
  }

  return Response.json({ processed: results.length, results });
}

export async function GET(request) {
  return POST(request);
}
