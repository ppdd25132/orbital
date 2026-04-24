import { requireSession, jsonError } from "@/lib/api-guard";
import { listInflectExportEvents } from "@/lib/orbital-store";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") || 100;
    const events = await listInflectExportEvents(session.user.email, { limit });

    return Response.json({
      events,
      ingestion_status: "not_ingested_by_inflect",
    });
  } catch (error) {
    return jsonError(error, "Failed to list Inflect export events");
  }
}
