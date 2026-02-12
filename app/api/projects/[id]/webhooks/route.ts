import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/webhooks - List webhooks
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from("webhooks") as any)
    .select("id, url, events, is_active, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { success: false, error: "Failed to load webhooks", code: "DB_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: data || [] });
}

// POST /api/projects/[id]/webhooks - Create a webhook
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body", code: "INVALID_BODY" },
      { status: 400 }
    );
  }

  const { url, events } = body as { url?: string; events?: string[] };

  if (!url) {
    return NextResponse.json(
      { success: false, error: "URL is required", code: "MISSING_URL" },
      { status: 400 }
    );
  }

  // Validate URL
  try {
    new URL(url);
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid URL", code: "INVALID_URL" },
      { status: 400 }
    );
  }

  const validEvents = ["code_redeemed", "batch_empty", "batch_low", "batch_created"];
  const selectedEvents = (events || ["code_redeemed"]).filter((e) =>
    validEvents.includes(e)
  );

  if (selectedEvents.length === 0) {
    return NextResponse.json(
      { success: false, error: "At least one valid event is required", code: "NO_EVENTS" },
      { status: 400 }
    );
  }

  // Generate a secret for HMAC signing
  const secret = `whsec_${randomBytes(24).toString("hex")}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from("webhooks") as any)
    .insert({
      project_id: projectId,
      url,
      secret,
      events: selectedEvents,
    })
    .select("id, url, secret, events, is_active, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: "Failed to create webhook", code: "DB_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}
