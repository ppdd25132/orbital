import { requireSession, parseLimitedJson, jsonError } from "@/lib/api-guard";
import { auditLog, createClientMapping, listClientMappings } from "@/lib/orbital-store";

export const runtime = "nodejs";

const MAPPING_TYPES = new Set(["email", "domain", "thread", "participant"]);

export async function GET() {
  try {
    const session = await requireSession();
    const mappings = await listClientMappings(session.user.email);
    return Response.json({ mappings });
  } catch (error) {
    return jsonError(error, "Failed to list client mappings");
  }
}

export async function POST(request) {
  try {
    const session = await requireSession();
    const body = await parseLimitedJson(request);
    const {
      mappingType,
      mappingValue,
      displayName,
      scope = {},
      metadata = {},
    } = body;

    const normalizedType = String(mappingType || "").trim().toLowerCase();
    if (!MAPPING_TYPES.has(normalizedType)) {
      return Response.json({ error: "mappingType must be email, domain, thread, or participant" }, { status: 400 });
    }

    if (!mappingValue || !displayName) {
      return Response.json({ error: "mappingValue and displayName are required" }, { status: 400 });
    }

    const mapping = await createClientMapping({
      userEmail: session.user.email,
      mappingType: normalizedType,
      mappingValue,
      displayName,
      scope,
      metadata,
    });

    await auditLog({
      userEmail: session.user.email,
      action: "client_mapping_saved",
      targetType: "client_mapping",
      targetId: mapping.id,
      metadata: { mappingType: normalizedType, mappingValue },
      scope,
    }).catch(() => {});

    return Response.json({ mapping });
  } catch (error) {
    return jsonError(error, "Failed to save client mapping");
  }
}
