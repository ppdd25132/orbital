import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const DEFAULT_JSON_LIMIT_BYTES = 200_000;

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }
  return session;
}

export async function parseLimitedJson(request, limitBytes = DEFAULT_JSON_LIMIT_BYTES) {
  const text = await request.text();
  if (text.length > limitBytes) {
    const error = new Error("Request body too large");
    error.status = 413;
    throw error;
  }

  if (!text.trim()) return {};

  try {
    return JSON.parse(text);
  } catch {
    const error = new Error("Invalid JSON body");
    error.status = 400;
    throw error;
  }
}

export function jsonError(error, fallback = "Request failed") {
  const status = typeof error?.status === "number" ? error.status : 500;
  const message = error?.message || fallback;
  return Response.json({ error: message }, { status });
}
