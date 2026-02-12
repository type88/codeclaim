import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string; webhookId: string }>;
}

// POST /api/projects/[id]/webhooks/[webhookId]/test - Send a test webhook
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: projectId, webhookId } = await params;
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

  // Get the Supabase project URL for Edge Function invocation
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { success: false, error: "Server configuration error", code: "CONFIG_ERROR" },
      { status: 500 }
    );
  }

  // Get webhook to verify it exists and belongs to the user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: webhook, error: webhookError } = await (supabase
    .from("webhooks") as any)
    .select("id, url")
    .eq("id", webhookId)
    .eq("project_id", projectId)
    .single();

  if (webhookError || !webhook) {
    return NextResponse.json(
      { success: false, error: "Webhook not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // Get the user's session token for Edge Function auth
  const { data: { session } } = await supabase.auth.getSession();

  // Call the send-webhook Edge Function with a test payload
  const response = await fetch(`${supabaseUrl}/functions/v1/send-webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session?.access_token || supabaseAnonKey}`,
    },
    body: JSON.stringify({
      project_id: projectId,
      event_type: "test",
      payload: {
        message: "This is a test webhook from SudoGrab",
        webhook_id: webhookId,
        timestamp: new Date().toISOString(),
      },
    }),
  });

  const result = await response.json();

  return NextResponse.json({
    success: true,
    data: result,
  });
}
