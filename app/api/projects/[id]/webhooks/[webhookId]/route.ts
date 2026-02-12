import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string; webhookId: string }>;
}

// DELETE /api/projects/[id]/webhooks/[webhookId] - Delete a webhook
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { webhookId } = await params;
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
  const { error } = await (supabase
    .from("webhooks") as any)
    .delete()
    .eq("id", webhookId);

  if (error) {
    return NextResponse.json(
      { success: false, error: "Failed to delete webhook", code: "DB_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

// PATCH /api/projects/[id]/webhooks/[webhookId] - Toggle active state
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { webhookId } = await params;
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

  const updates: Record<string, unknown> = {};
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (body.events !== undefined) updates.events = body.events;
  if (body.url !== undefined) updates.url = body.url;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from("webhooks") as any)
    .update(updates)
    .eq("id", webhookId)
    .select("id, url, events, is_active, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: "Failed to update webhook", code: "DB_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}
