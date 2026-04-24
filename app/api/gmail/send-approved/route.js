import { requireSession, parseLimitedJson, jsonError } from "@/lib/api-guard";
import { sendMessage } from "@/lib/gmail";
import { getLinkedAccounts, refreshTokenIfNeeded } from "@/lib/linked-accounts";
import {
  auditLog,
  getConnectedAccountToken,
  getDraftForUser,
  requireApprovedTarget,
  updateDraftBodyAndStatus,
} from "@/lib/orbital-store";

export const runtime = "nodejs";

async function tokenForDraft(request, session, draft) {
  const accountEmail = draft.account_email;
  const userEmail = session.user?.email;

  if (accountEmail && accountEmail !== userEmail) {
    const dbToken = await getConnectedAccountToken(userEmail, accountEmail).catch(() => null);
    if (dbToken?.access_token) {
      return (await refreshTokenIfNeeded({ email: accountEmail, ...dbToken })).access_token;
    }

    const linked = getLinkedAccounts(request);
    const account = linked.find((item) => item.email === accountEmail);
    if (account) {
      return (await refreshTokenIfNeeded(account)).access_token;
    }
  }

  if (session.access_token) return session.access_token;

  const primaryToken = await getConnectedAccountToken(userEmail, userEmail).catch(() => null);
  return primaryToken?.access_token || null;
}

export async function POST(request) {
  try {
    const session = await requireSession();
    const userEmail = session.user.email;
    const { draftId } = await parseLimitedJson(request);

    if (!draftId) {
      return Response.json({ error: "draftId is required" }, { status: 400 });
    }

    const draft = await getDraftForUser(userEmail, draftId);
    if (!draft) {
      return Response.json({ error: "Draft not found" }, { status: 404 });
    }

    const approval = await requireApprovedTarget(userEmail, "draft_response", draftId);
    const token = await tokenForDraft(request, session, draft);
    if (!token) {
      return Response.json({ error: "No Gmail token available for approved send" }, { status: 409 });
    }

    const result = await sendMessage(token, {
      to: draft.to_email,
      subject: draft.subject,
      body: draft.body,
      replyToMessageId: draft.reply_to_message_id,
    });

    const updatedDraft = await updateDraftBodyAndStatus(userEmail, draftId, {
      status: "sent",
    });

    await auditLog({
      userEmail,
      action: "approved_email_sent",
      targetType: "draft_response",
      targetId: draftId,
      metadata: { approvalId: approval.id, gmailMessageId: result.id || null },
    }).catch(() => {});

    return Response.json({ message: result, draft: updatedDraft, approval });
  } catch (error) {
    return jsonError(error, "Failed to send approved draft");
  }
}
