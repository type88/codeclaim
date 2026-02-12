import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string; webhookId: string }>;
}

// GET /api/projects/[id]/webhooks/[webhookId]/deliveries - List recent deliveries
export async function GET(request: NextRequest, { params }: RouteParams) {
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
  const { data, error } = await (supabase
    .from("webhook_deliveries") as any)
    .select("id, event_type, response_status, success, delivered_at")
    .eq("webhook_id", webhookId)
    .order("delivered_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json(
      { success: false, error: "Failed to load deliveries", code: "DB_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: data || [] });
}
